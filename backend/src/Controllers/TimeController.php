<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;

class TimeController
{
    /**
     * GET /time-entries
     */
    public static function index(): void
    {
        $user = AuthMiddleware::authenticate();

        $sql = "SELECT te.*, t.title as task_title, p.name as project_name, p.code as project_code,
                       u.name as user_name, a.name as approver_name
                FROM time_entries te
                INNER JOIN tasks t ON te.task_id = t.id
                INNER JOIN projects p ON t.project_id = p.id
                INNER JOIN users u ON te.user_id = u.id
                LEFT JOIN users a ON te.approved_by = a.id
                WHERE 1=1";

        $params = [];

        // Filter by user (employees see only their own)
        if (!AuthMiddleware::isPM()) {
            $sql .= " AND te.user_id = ?";
            $params[] = $user['id'];
        } elseif (isset($_GET['user_id'])) {
            $sql .= " AND te.user_id = ?";
            $params[] = $_GET['user_id'];
        }

        // Filter by date range
        if (isset($_GET['start_date'])) {
            $sql .= " AND te.date >= ?";
            $params[] = $_GET['start_date'];
        }
        if (isset($_GET['end_date'])) {
            $sql .= " AND te.date <= ?";
            $params[] = $_GET['end_date'];
        }

        // Filter by task
        if (isset($_GET['task_id'])) {
            $sql .= " AND te.task_id = ?";
            $params[] = $_GET['task_id'];
        }

        // Filter by project
        if (isset($_GET['project_id'])) {
            $sql .= " AND t.project_id = ?";
            $params[] = $_GET['project_id'];
        }

        // Filter by approval status
        if (isset($_GET['is_approved'])) {
            $sql .= " AND te.is_approved = ?";
            $params[] = $_GET['is_approved'] === 'true' ? 1 : 0;
        }

        $sql .= " ORDER BY te.date DESC, te.created_at DESC";

        // Pagination
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(10, (int)($_GET['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;

        $sql .= " LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = $offset;

        $entries = Database::fetchAll($sql, $params);

        Response::success($entries);
    }

    /**
     * POST /time-entries
     */
    public static function store(): void
    {
        $user = AuthMiddleware::authenticate();

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('task_id')
            ->integer('task_id')
            ->required('hours')
            ->numeric('hours')
            ->required('date')
            ->date('date');

        $validator->validate();

        // Verify task exists and user has access
        $task = Database::fetch(
            "SELECT t.project_id FROM tasks t WHERE t.id = ?",
            [$data['task_id']]
        );

        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        // Validate hours (0.25 to 24)
        if ($data['hours'] < 0.25 || $data['hours'] > 24) {
            Response::error('Hours must be between 0.25 and 24', 400);
        }

        $entryId = Database::insert('time_entries', [
            'task_id' => $data['task_id'],
            'user_id' => $user['id'],
            'date' => $data['date'],
            'hours' => $data['hours'],
            'notes' => $data['notes'] ?? null,
            'is_billable' => isset($data['is_billable']) ? ($data['is_billable'] ? 1 : 0) : 1
        ]);

        // Update task actual hours
        self::updateTaskActualHours($data['task_id']);

        $entry = Database::fetch(
            "SELECT te.*, t.title as task_title
             FROM time_entries te
             INNER JOIN tasks t ON te.task_id = t.id
             WHERE te.id = ?",
            [$entryId]
        );

        Response::created($entry, 'Time entry created successfully');
    }

    /**
     * PUT /time-entries/:id
     */
    public static function update(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $entry = Database::fetch("SELECT * FROM time_entries WHERE id = ?", [$id]);

        if (!$entry) {
            Response::notFound('Time entry not found');
        }

        // Can only edit own entries unless admin/PM
        if ($entry['user_id'] !== $user['id'] && !AuthMiddleware::isPM()) {
            Response::forbidden('You can only edit your own time entries');
        }

        // Can't edit approved entries unless admin
        if ($entry['is_approved'] && !AuthMiddleware::isAdmin()) {
            Response::error('Cannot edit approved time entries', 400);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data);
        if (isset($data['hours'])) {
            $validator->numeric('hours');
        }
        if (isset($data['date'])) {
            $validator->date('date');
        }

        $validator->validate();

        $updateData = [];
        $allowedFields = ['hours', 'date', 'notes', 'is_billable'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            Database::update('time_entries', $updateData, 'id = ?', [$id]);
            self::updateTaskActualHours($entry['task_id']);
        }

        $updatedEntry = Database::fetch("SELECT * FROM time_entries WHERE id = ?", [$id]);

        Response::success($updatedEntry, 'Time entry updated successfully');
    }

    /**
     * DELETE /time-entries/:id
     */
    public static function destroy(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $entry = Database::fetch("SELECT * FROM time_entries WHERE id = ?", [$id]);

        if (!$entry) {
            Response::notFound('Time entry not found');
        }

        if ($entry['user_id'] !== $user['id'] && !AuthMiddleware::isPM()) {
            Response::forbidden('You can only delete your own time entries');
        }

        if ($entry['is_approved'] && !AuthMiddleware::isAdmin()) {
            Response::error('Cannot delete approved time entries', 400);
        }

        Database::delete('time_entries', 'id = ?', [$id]);
        self::updateTaskActualHours($entry['task_id']);

        Response::success(null, 'Time entry deleted successfully');
    }

    /**
     * POST /time-entries/:id/approve
     */
    public static function approve(int $id): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $entry = Database::fetch(
            "SELECT te.*, t.project_id FROM time_entries te
             INNER JOIN tasks t ON te.task_id = t.id
             WHERE te.id = ?",
            [$id]
        );

        if (!$entry) {
            Response::notFound('Time entry not found');
        }

        // PM can only approve for their projects
        if (!AuthMiddleware::isAdmin() && !AuthMiddleware::canManageProject($entry['project_id'])) {
            Response::forbidden('You can only approve time for your projects');
        }

        Database::update('time_entries', [
            'is_approved' => 1,
            'approved_by' => $user['id'],
            'approved_at' => date('Y-m-d H:i:s')
        ], 'id = ?', [$id]);

        Response::success(null, 'Time entry approved');
    }

    /**
     * GET /timer
     */
    public static function getTimer(): void
    {
        $user = AuthMiddleware::authenticate();

        $timer = Database::fetch(
            "SELECT at.*, t.title as task_title, p.name as project_name
             FROM active_timers at
             INNER JOIN tasks t ON at.task_id = t.id
             INNER JOIN projects p ON t.project_id = p.id
             WHERE at.user_id = ?",
            [$user['id']]
        );

        if ($timer) {
            $timer['elapsed_seconds'] = time() - strtotime($timer['started_at']);
        }

        Response::success($timer);
    }

    /**
     * POST /timer/start
     */
    public static function startTimer(): void
    {
        $user = AuthMiddleware::authenticate();

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('task_id')
            ->integer('task_id');

        $validator->validate();

        // Check for existing timer
        $existing = Database::fetch(
            "SELECT id FROM active_timers WHERE user_id = ?",
            [$user['id']]
        );

        if ($existing) {
            Response::error('Timer already running. Stop it first.', 400);
        }

        // Verify task access
        $task = Database::fetch("SELECT project_id FROM tasks WHERE id = ?", [$data['task_id']]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        Database::insert('active_timers', [
            'user_id' => $user['id'],
            'task_id' => $data['task_id']
        ]);

        Response::success(null, 'Timer started');
    }

    /**
     * POST /timer/stop
     */
    public static function stopTimer(): void
    {
        $user = AuthMiddleware::authenticate();

        $timer = Database::fetch(
            "SELECT * FROM active_timers WHERE user_id = ?",
            [$user['id']]
        );

        if (!$timer) {
            Response::error('No timer running', 400);
        }

        // Calculate elapsed time
        $elapsedSeconds = time() - strtotime($timer['started_at']);
        $hours = round($elapsedSeconds / 3600, 2);

        // Minimum 0.25 hours (15 minutes)
        if ($hours < 0.25) {
            $hours = 0.25;
        }

        // Create time entry
        $entryId = Database::insert('time_entries', [
            'task_id' => $timer['task_id'],
            'user_id' => $user['id'],
            'date' => date('Y-m-d'),
            'hours' => $hours,
            'notes' => 'Logged via timer',
            'is_billable' => 1
        ]);

        // Update task actual hours
        self::updateTaskActualHours($timer['task_id']);

        // Delete timer
        Database::delete('active_timers', 'user_id = ?', [$user['id']]);

        $entry = Database::fetch("SELECT * FROM time_entries WHERE id = ?", [$entryId]);

        Response::success($entry, 'Timer stopped and time logged');
    }

    /**
     * GET /timesheet
     */
    public static function timesheet(): void
    {
        $user = AuthMiddleware::authenticate();

        $userId = $_GET['user_id'] ?? $user['id'];

        // Non-PMs can only see their own timesheet
        if (!AuthMiddleware::isPM() && $userId != $user['id']) {
            Response::forbidden('You can only view your own timesheet');
        }

        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('monday this week'));
        $endDate = $_GET['end_date'] ?? date('Y-m-d', strtotime('sunday this week'));

        $entries = Database::fetchAll(
            "SELECT te.*, t.title as task_title, p.name as project_name, p.code as project_code
             FROM time_entries te
             INNER JOIN tasks t ON te.task_id = t.id
             INNER JOIN projects p ON t.project_id = p.id
             WHERE te.user_id = ? AND te.date BETWEEN ? AND ?
             ORDER BY te.date ASC, te.created_at ASC",
            [$userId, $startDate, $endDate]
        );

        // Calculate totals
        $totalHours = array_sum(array_column($entries, 'hours'));
        $billableHours = array_sum(array_map(
            fn($e) => $e['is_billable'] ? $e['hours'] : 0,
            $entries
        ));

        // Group by date
        $byDate = [];
        foreach ($entries as $entry) {
            $date = $entry['date'];
            if (!isset($byDate[$date])) {
                $byDate[$date] = ['entries' => [], 'total' => 0];
            }
            $byDate[$date]['entries'][] = $entry;
            $byDate[$date]['total'] += $entry['hours'];
        }

        Response::success([
            'entries' => $entries,
            'by_date' => $byDate,
            'summary' => [
                'total_hours' => $totalHours,
                'billable_hours' => $billableHours,
                'non_billable_hours' => $totalHours - $billableHours
            ]
        ]);
    }

    private static function updateTaskActualHours(int $taskId): void
    {
        $result = Database::fetch(
            "SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE task_id = ?",
            [$taskId]
        );

        Database::update('tasks', [
            'actual_hours' => $result['total']
        ], 'id = ?', [$taskId]);
    }
}
