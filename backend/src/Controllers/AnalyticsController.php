<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Services\XPService;

class AnalyticsController
{
    /**
     * GET /dashboard/admin
     */
    public static function adminDashboard(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin');

        // Overview stats
        $overview = Database::fetch(
            "SELECT
                (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
                (SELECT COUNT(*) FROM tasks WHERE status NOT IN ('complete', 'blocked')) as active_tasks,
                (SELECT COUNT(*) FROM tasks WHERE status = 'complete' AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as completed_this_week,
                (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_users,
                (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as hours_this_week,
                (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND is_billable = 1) as billable_hours_this_week
            "
        );

        // Tasks due soon
        $tasksDueSoon = Database::fetchAll(
            "SELECT t.*, p.name as project_name, u.name as owner_name
             FROM tasks t
             INNER JOIN projects p ON t.project_id = p.id
             LEFT JOIN users u ON t.owner_id = u.id
             WHERE t.status NOT IN ('complete', 'blocked')
               AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
             ORDER BY t.due_date ASC
             LIMIT 10"
        );

        // Recent activity
        $recentActivity = Database::fetchAll(
            "SELECT al.*, u.name as user_name
             FROM activity_log al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT 15"
        );

        // Project progress
        $projectProgress = Database::fetchAll(
            "SELECT p.*,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'complete') as completed_tasks
             FROM projects p
             WHERE p.status = 'active'
             ORDER BY p.due_date ASC
             LIMIT 5"
        );

        foreach ($projectProgress as &$project) {
            $project['progress'] = $project['total_tasks'] > 0
                ? round(($project['completed_tasks'] / $project['total_tasks']) * 100)
                : 0;
        }

        Response::success([
            'overview' => $overview,
            'tasks_due_soon' => $tasksDueSoon,
            'recent_activity' => $recentActivity,
            'project_progress' => $projectProgress
        ]);
    }

    /**
     * GET /dashboard/pm
     */
    public static function pmDashboard(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        // Get projects this PM manages
        $projectIds = Database::fetchAll(
            "SELECT project_id FROM project_members WHERE user_id = ? AND role IN ('owner', 'manager')",
            [$user['id']]
        );

        $projectIdList = array_column($projectIds, 'project_id');

        if (empty($projectIdList)) {
            Response::success([
                'overview' => ['my_projects' => 0, 'my_tasks' => 0],
                'my_projects' => [],
                'team_tasks' => [],
                'my_tasks' => []
            ]);
            return;
        }

        $placeholders = implode(',', array_fill(0, count($projectIdList), '?'));

        // Overview for PM's projects
        $overview = Database::fetch(
            "SELECT
                (SELECT COUNT(*) FROM projects WHERE id IN ({$placeholders}) AND status = 'active') as my_projects,
                (SELECT COUNT(*) FROM tasks WHERE project_id IN ({$placeholders}) AND status NOT IN ('complete', 'blocked')) as active_tasks,
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND status NOT IN ('complete', 'blocked')) as my_tasks
            ",
            [...$projectIdList, ...$projectIdList, $user['id']]
        );

        // PM's projects
        $myProjects = Database::fetchAll(
            "SELECT p.*,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'complete') as completed_tasks
             FROM projects p
             WHERE p.id IN ({$placeholders}) AND p.status = 'active'
             ORDER BY p.due_date ASC",
            $projectIdList
        );

        foreach ($myProjects as &$project) {
            $project['progress'] = $project['total_tasks'] > 0
                ? round(($project['completed_tasks'] / $project['total_tasks']) * 100)
                : 0;
        }

        // Team members' tasks
        $teamTasks = Database::fetchAll(
            "SELECT t.*, u.name as owner_name, u.avatar_url, p.name as project_name
             FROM tasks t
             INNER JOIN projects p ON t.project_id = p.id
             LEFT JOIN users u ON t.owner_id = u.id
             WHERE t.project_id IN ({$placeholders})
               AND t.status NOT IN ('complete', 'blocked')
             ORDER BY t.due_date ASC
             LIMIT 20",
            $projectIdList
        );

        // PM's own tasks
        $myTasks = Database::fetchAll(
            "SELECT t.*, p.name as project_name
             FROM tasks t
             INNER JOIN projects p ON t.project_id = p.id
             WHERE t.owner_id = ? AND t.status NOT IN ('complete', 'blocked')
             ORDER BY t.priority DESC, t.due_date ASC
             LIMIT 10",
            [$user['id']]
        );

        Response::success([
            'overview' => $overview,
            'my_projects' => $myProjects,
            'team_tasks' => $teamTasks,
            'my_tasks' => $myTasks
        ]);
    }

    /**
     * GET /dashboard/employee
     */
    public static function employeeDashboard(): void
    {
        $user = AuthMiddleware::authenticate();

        // Overview
        $overview = Database::fetch(
            "SELECT
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND status NOT IN ('complete', 'blocked')) as active_tasks,
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND status = 'complete' AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as completed_this_week,
                (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as hours_this_week
            ",
            [$user['id'], $user['id'], $user['id']]
        );

        // My tasks
        $myTasks = Database::fetchAll(
            "SELECT t.*, p.name as project_name, p.code as project_code
             FROM tasks t
             INNER JOIN projects p ON t.project_id = p.id
             WHERE t.owner_id = ? AND t.status NOT IN ('complete', 'blocked')
             ORDER BY
                CASE t.priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                t.due_date ASC
             LIMIT 15",
            [$user['id']]
        );

        // Recent time entries
        $recentTimeEntries = Database::fetchAll(
            "SELECT te.*, t.title as task_title, p.name as project_name
             FROM time_entries te
             INNER JOIN tasks t ON te.task_id = t.id
             INNER JOIN projects p ON t.project_id = p.id
             WHERE te.user_id = ?
             ORDER BY te.date DESC, te.created_at DESC
             LIMIT 10",
            [$user['id']]
        );

        // XP progress
        $xpProgress = XPService::getUserProgress($user['id']);

        // Recent notifications
        $notifications = Database::fetchAll(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
            [$user['id']]
        );

        Response::success([
            'overview' => $overview,
            'my_tasks' => $myTasks,
            'recent_time_entries' => $recentTimeEntries,
            'xp_progress' => $xpProgress,
            'notifications' => $notifications
        ]);
    }

    /**
     * GET /analytics/utilization
     */
    public static function utilization(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('monday this week'));
        $endDate = $_GET['end_date'] ?? date('Y-m-d', strtotime('sunday this week'));

        $users = Database::fetchAll(
            "SELECT u.id, u.name, u.avatar_url, u.designation, u.weekly_capacity_hours,
                    COALESCE(SUM(te.hours), 0) as logged_hours,
                    COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.hours ELSE 0 END), 0) as billable_hours
             FROM users u
             LEFT JOIN time_entries te ON u.id = te.user_id AND te.date BETWEEN ? AND ?
             WHERE u.is_active = 1
             GROUP BY u.id
             ORDER BY u.name",
            [$startDate, $endDate]
        );

        foreach ($users as &$u) {
            $u['utilization_percent'] = $u['weekly_capacity_hours'] > 0
                ? round(($u['logged_hours'] / $u['weekly_capacity_hours']) * 100, 1)
                : 0;
            $u['billable_percent'] = $u['logged_hours'] > 0
                ? round(($u['billable_hours'] / $u['logged_hours']) * 100, 1)
                : 0;
        }

        Response::success($users);
    }

    /**
     * GET /analytics/roi
     */
    public static function roi(): void
    {
        AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin');

        // Employee ROI calculation
        $employees = Database::fetchAll(
            "SELECT u.id, u.name, u.avatar_url, u.designation, u.role,
                    u.hourly_cost, u.weekly_capacity_hours
             FROM users u
             WHERE u.is_active = 1 AND u.role IN ('employee', 'pm')
             ORDER BY u.name"
        );

        $results = [];
        $totalCost = 0;
        $totalValue = 0;

        foreach ($employees as $emp) {
            // Calculate monthly cost (hourly_cost * weekly_capacity * 4.33 weeks)
            $monthlyCost = $emp['hourly_cost'] * $emp['weekly_capacity_hours'] * 4.33;

            // Calculate value generated (sum of hours * project hourly rate)
            $valueResult = Database::fetch(
                "SELECT COALESCE(SUM(te.hours * p.hourly_rate), 0) as value
                 FROM time_entries te
                 INNER JOIN tasks t ON te.task_id = t.id
                 INNER JOIN projects p ON t.project_id = p.id
                 WHERE te.user_id = ?
                   AND te.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                   AND te.is_billable = 1",
                [$emp['id']]
            );

            $monthlyValue = (float) $valueResult['value'];

            $roi = $monthlyCost > 0 ? round($monthlyValue / $monthlyCost, 2) : 0;

            // Determine verdict
            $verdict = 'alert';
            if ($roi >= 3.5) {
                $verdict = 'star';
            } elseif ($roi >= 2.5) {
                $verdict = 'good';
            } elseif ($roi >= 2.0) {
                $verdict = 'watch';
            }

            $results[] = [
                'id' => $emp['id'],
                'name' => $emp['name'],
                'avatar_url' => $emp['avatar_url'],
                'designation' => $emp['designation'],
                'role' => $emp['role'],
                'monthly_cost' => $monthlyCost,
                'monthly_value' => $monthlyValue,
                'roi' => $roi,
                'verdict' => $verdict
            ];

            $totalCost += $monthlyCost;
            $totalValue += $monthlyValue;
        }

        $teamROI = $totalCost > 0 ? round($totalValue / $totalCost, 2) : 0;

        Response::success([
            'summary' => [
                'total_value' => $totalValue,
                'total_cost' => $totalCost,
                'team_roi' => $teamROI
            ],
            'employees' => $results
        ]);
    }

    /**
     * GET /analytics/capacity
     */
    public static function capacity(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('monday this week'));
        $endDate = $_GET['end_date'] ?? date('Y-m-d', strtotime('sunday this week'));

        // Get all active users
        $users = Database::fetchAll(
            "SELECT id, name, avatar_url, designation, weekly_capacity_hours FROM users WHERE is_active = 1 ORDER BY name"
        );

        // Generate date range
        $dates = [];
        $current = strtotime($startDate);
        $end = strtotime($endDate);

        while ($current <= $end) {
            $dates[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        $heatmapData = [];

        foreach ($users as $u) {
            $dailyCapacity = $u['weekly_capacity_hours'] / 5; // Assuming 5-day week

            $userData = [
                'user_id' => $u['id'],
                'name' => $u['name'],
                'avatar_url' => $u['avatar_url'],
                'designation' => $u['designation'],
                'daily_capacity' => $dailyCapacity,
                'days' => []
            ];

            $weekTotal = 0;

            foreach ($dates as $date) {
                // Get allocated hours from tasks
                $allocated = Database::fetch(
                    "SELECT COALESCE(SUM(estimated_hours), 0) as hours
                     FROM tasks
                     WHERE owner_id = ? AND start_date <= ? AND (due_date >= ? OR due_date IS NULL)
                       AND status NOT IN ('complete', 'blocked')",
                    [$u['id'], $date, $date]
                );

                // Get logged hours
                $logged = Database::fetch(
                    "SELECT COALESCE(SUM(hours), 0) as hours FROM time_entries WHERE user_id = ? AND date = ?",
                    [$u['id'], $date]
                );

                $allocatedHours = (float) ($allocated['hours'] ?? 0);
                $loggedHours = (float) ($logged['hours'] ?? 0);

                // Use max of allocated or logged
                $hours = max($allocatedHours, $loggedHours);
                $utilization = $dailyCapacity > 0 ? round(($hours / $dailyCapacity) * 100) : 0;

                $userData['days'][$date] = [
                    'allocated' => $allocatedHours,
                    'logged' => $loggedHours,
                    'utilization' => $utilization
                ];

                $weekTotal += $hours;
            }

            $userData['week_total'] = $weekTotal;
            $userData['week_utilization'] = $u['weekly_capacity_hours'] > 0
                ? round(($weekTotal / $u['weekly_capacity_hours']) * 100)
                : 0;

            $heatmapData[] = $userData;
        }

        Response::success([
            'dates' => $dates,
            'users' => $heatmapData
        ]);
    }

    /**
     * GET /analytics/dashboard
     */
    public static function dashboard(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $range = $_GET['range'] ?? 'week';

        // Calculate date range
        switch ($range) {
            case 'month':
                $startDate = date('Y-m-01');
                $endDate = date('Y-m-t');
                break;
            case 'quarter':
                $quarter = ceil(date('n') / 3);
                $startMonth = ($quarter - 1) * 3 + 1;
                $startDate = date('Y-' . str_pad($startMonth, 2, '0', STR_PAD_LEFT) . '-01');
                $endDate = date('Y-m-t', strtotime("+2 months", strtotime($startDate)));
                break;
            case 'year':
                $startDate = date('Y-01-01');
                $endDate = date('Y-12-31');
                break;
            default: // week
                $startDate = date('Y-m-d', strtotime('monday this week'));
                $endDate = date('Y-m-d', strtotime('sunday this week'));
        }

        // Get stats
        $stats = Database::fetch(
            "SELECT
                (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
                (SELECT COUNT(*) FROM projects WHERE status = 'completed') as completed_projects,
                (SELECT COUNT(*) FROM tasks WHERE status = 'complete' AND completed_at BETWEEN ? AND ?) as tasks_completed,
                (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') as tasks_in_progress,
                (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE date BETWEEN ? AND ?) as total_hours,
                (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE date BETWEEN ? AND ? AND is_billable = 1) as billable_hours
            ",
            [$startDate, $endDate, $startDate, $endDate, $startDate, $endDate]
        );

        // Calculate revenue and cost
        $revenueResult = Database::fetch(
            "SELECT COALESCE(SUM(te.hours * p.hourly_rate), 0) as revenue
             FROM time_entries te
             INNER JOIN tasks t ON te.task_id = t.id
             INNER JOIN projects p ON t.project_id = p.id
             WHERE te.date BETWEEN ? AND ? AND te.is_billable = 1",
            [$startDate, $endDate]
        );

        $costResult = Database::fetch(
            "SELECT COALESCE(SUM(te.hours * u.hourly_cost), 0) as cost
             FROM time_entries te
             INNER JOIN users u ON te.user_id = u.id
             WHERE te.date BETWEEN ? AND ?",
            [$startDate, $endDate]
        );

        Response::success([
            'active_projects' => (int) $stats['active_projects'],
            'completed_projects' => (int) $stats['completed_projects'],
            'tasks_completed' => (int) $stats['tasks_completed'],
            'tasks_in_progress' => (int) $stats['tasks_in_progress'],
            'total_hours' => (float) $stats['total_hours'],
            'billable_hours' => (float) $stats['billable_hours'],
            'revenue' => (float) $revenueResult['revenue'],
            'cost' => (float) $costResult['cost']
        ]);
    }

    /**
     * GET /analytics/projects-roi
     */
    public static function projectsROI(): void
    {
        AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $projects = Database::fetchAll(
            "SELECT p.*,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'complete') as completed_tasks
             FROM projects p
             WHERE p.status IN ('active', 'completed')
             ORDER BY p.updated_at DESC
             LIMIT 10"
        );

        $results = [];

        foreach ($projects as $project) {
            // Calculate actual cost (hours * user hourly_cost)
            $costResult = Database::fetch(
                "SELECT COALESCE(SUM(te.hours * u.hourly_cost), 0) as cost,
                        COALESCE(SUM(te.hours), 0) as hours
                 FROM time_entries te
                 INNER JOIN tasks t ON te.task_id = t.id
                 INNER JOIN users u ON te.user_id = u.id
                 WHERE t.project_id = ?",
                [$project['id']]
            );

            $cost = (float) $costResult['cost'];
            $hours = (float) $costResult['hours'];
            $budget = (float) $project['budget'];

            // Calculate ROI as percentage
            $roi = $budget > 0 ? round((($budget - $cost) / $budget) * 100) : 0;

            // Calculate progress
            $progress = $project['total_tasks'] > 0
                ? round(($project['completed_tasks'] / $project['total_tasks']) * 100)
                : 0;

            $results[] = [
                'id' => $project['id'],
                'name' => $project['name'],
                'client_name' => $project['client_name'],
                'budget' => $budget,
                'cost' => $cost,
                'hours' => $hours,
                'roi' => $roi,
                'progress' => $progress
            ];
        }

        Response::success($results);
    }

    /**
     * GET /analytics/team-performance
     */
    public static function teamPerformance(): void
    {
        AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $range = $_GET['range'] ?? 'week';

        // Calculate date range
        switch ($range) {
            case 'month':
                $startDate = date('Y-m-01');
                $endDate = date('Y-m-t');
                break;
            case 'quarter':
                $quarter = ceil(date('n') / 3);
                $startMonth = ($quarter - 1) * 3 + 1;
                $startDate = date('Y-' . str_pad($startMonth, 2, '0', STR_PAD_LEFT) . '-01');
                $endDate = date('Y-m-t', strtotime("+2 months", strtotime($startDate)));
                break;
            case 'year':
                $startDate = date('Y-01-01');
                $endDate = date('Y-12-31');
                break;
            default:
                $startDate = date('Y-m-d', strtotime('monday this week'));
                $endDate = date('Y-m-d', strtotime('sunday this week'));
        }

        $users = Database::fetchAll(
            "SELECT u.id, u.name, u.avatar_url, u.designation, u.xp_total,
                    u.weekly_capacity_hours
             FROM users u
             WHERE u.is_active = 1
             ORDER BY u.name"
        );

        $results = [];

        foreach ($users as $u) {
            // Tasks completed in range
            $taskStats = Database::fetch(
                "SELECT COUNT(*) as completed
                 FROM tasks
                 WHERE owner_id = ? AND status = 'complete'
                   AND completed_at BETWEEN ? AND ?",
                [$u['id'], $startDate, $endDate]
            );

            // Hours logged in range
            $timeStats = Database::fetch(
                "SELECT COALESCE(SUM(hours), 0) as logged,
                        COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable
                 FROM time_entries
                 WHERE user_id = ? AND date BETWEEN ? AND ?",
                [$u['id'], $startDate, $endDate]
            );

            // Calculate efficiency (estimated vs actual)
            $efficiencyResult = Database::fetch(
                "SELECT COALESCE(SUM(t.estimated_hours), 0) as estimated,
                        COALESCE(SUM(te.hours), 0) as actual
                 FROM tasks t
                 LEFT JOIN time_entries te ON te.task_id = t.id
                 WHERE t.owner_id = ? AND t.status = 'complete'
                   AND t.completed_at BETWEEN ? AND ?",
                [$u['id'], $startDate, $endDate]
            );

            $estimated = (float) $efficiencyResult['estimated'];
            $actual = (float) $efficiencyResult['actual'];
            $efficiency = $actual > 0 ? round(($estimated / $actual) * 100) : 100;

            $results[] = [
                'id' => $u['id'],
                'name' => $u['name'],
                'avatar_url' => $u['avatar_url'],
                'designation' => $u['designation'],
                'tasks_completed' => (int) $taskStats['completed'],
                'hours_logged' => (float) $timeStats['logged'],
                'billable_hours' => (float) $timeStats['billable'],
                'efficiency' => min(200, $efficiency), // Cap at 200%
                'xp' => (int) $u['xp_total']
            ];
        }

        // Sort by tasks completed descending
        usort($results, function ($a, $b) {
            return $b['tasks_completed'] - $a['tasks_completed'];
        });

        Response::success($results);
    }
}
