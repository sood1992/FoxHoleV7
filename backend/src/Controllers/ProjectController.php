<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;

class ProjectController
{
    /**
     * GET /projects
     */
    public static function index(): void
    {
        $user = AuthMiddleware::authenticate();

        $sql = "SELECT DISTINCT p.*, u.name as created_by_name,
                (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
                (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'complete') as completed_count
                FROM projects p
                LEFT JOIN users u ON p.created_by = u.id";

        $params = [];

        // Filter by access
        if (!AuthMiddleware::isAdmin()) {
            $sql .= " INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?";
            $params[] = $user['id'];
        }

        // Filter by status
        if (isset($_GET['status']) && $_GET['status'] !== 'all') {
            $sql .= " WHERE p.status = ?";
            $params[] = $_GET['status'];
        } else {
            $sql .= " WHERE p.status != 'archived'";
        }

        $sql .= " ORDER BY p.updated_at DESC";

        $projects = Database::fetchAll($sql, $params);

        // Add progress percentage
        foreach ($projects as &$project) {
            $project['progress'] = $project['task_count'] > 0
                ? round(($project['completed_count'] / $project['task_count']) * 100)
                : 0;
        }

        Response::success($projects);
    }

    /**
     * GET /projects/:id
     */
    public static function show(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        if (!AuthMiddleware::canAccessProject($id)) {
            Response::forbidden('You do not have access to this project');
        }

        $project = Database::fetch(
            "SELECT p.*, u.name as created_by_name
             FROM projects p
             LEFT JOIN users u ON p.created_by = u.id
             WHERE p.id = ?",
            [$id]
        );

        if (!$project) {
            Response::notFound('Project not found');
        }

        // Get members
        $project['members'] = Database::fetchAll(
            "SELECT pm.*, u.name, u.email, u.avatar_url, u.designation
             FROM project_members pm
             INNER JOIN users u ON pm.user_id = u.id
             WHERE pm.project_id = ?
             ORDER BY pm.role, u.name",
            [$id]
        );

        // Get task stats
        $stats = Database::fetch(
            "SELECT
                COUNT(*) as total,
                SUM(status = 'complete') as completed,
                SUM(status = 'in_progress') as in_progress,
                SUM(status = 'blocked') as blocked,
                COALESCE(SUM(estimated_hours), 0) as estimated_hours,
                COALESCE(SUM(actual_hours), 0) as actual_hours
             FROM tasks WHERE project_id = ?",
            [$id]
        );

        $project['stats'] = [
            'total_tasks' => (int) $stats['total'],
            'completed_tasks' => (int) $stats['completed'],
            'in_progress_tasks' => (int) $stats['in_progress'],
            'blocked_tasks' => (int) $stats['blocked'],
            'estimated_hours' => (float) $stats['estimated_hours'],
            'actual_hours' => (float) $stats['actual_hours'],
            'progress' => $stats['total'] > 0 ? round(($stats['completed'] / $stats['total']) * 100) : 0
        ];

        Response::success($project);
    }

    /**
     * POST /projects
     */
    public static function store(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin', 'pm');

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('name')
            ->minLength('name', 2);

        if (!empty($data['code'])) {
            $validator->unique('code', 'projects', 'code');
        }

        $validator->validate();

        Database::beginTransaction();

        try {
            // Create project
            $projectId = Database::insert('projects', [
                'name' => $data['name'],
                'code' => $data['code'] ?? self::generateProjectCode(),
                'client_name' => $data['client_name'] ?? null,
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? 'planning',
                'workflow_template' => $data['workflow_template'] ?? 'custom',
                'budget' => $data['budget'] ?? 0,
                'hourly_rate' => $data['hourly_rate'] ?? 0,
                'start_date' => $data['start_date'] ?? null,
                'due_date' => $data['due_date'] ?? null,
                'created_by' => $user['id']
            ]);

            // Add creator as owner
            Database::insert('project_members', [
                'project_id' => $projectId,
                'user_id' => $user['id'],
                'role' => 'owner'
            ]);

            // Create default kanban columns based on workflow template
            self::createDefaultColumns($projectId, $data['workflow_template'] ?? 'custom');

            Database::commit();

            $project = Database::fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);

            Response::created($project, 'Project created successfully');

        } catch (\Exception $e) {
            Database::rollback();
            Response::serverError('Failed to create project: ' . $e->getMessage());
        }
    }

    /**
     * PUT /projects/:id
     */
    public static function update(int $id): void
    {
        AuthMiddleware::authenticate();

        if (!AuthMiddleware::canManageProject($id)) {
            Response::forbidden('You do not have permission to update this project');
        }

        $project = Database::fetch("SELECT id FROM projects WHERE id = ?", [$id]);
        if (!$project) {
            Response::notFound('Project not found');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data);

        if (isset($data['code'])) {
            $validator->unique('code', 'projects', 'code', $id);
        }
        if (isset($data['status'])) {
            $validator->in('status', ['planning', 'active', 'on_hold', 'completed', 'archived']);
        }

        $validator->validate();

        $updateData = [];
        $allowedFields = ['name', 'code', 'client_name', 'description', 'status', 'workflow_template', 'budget', 'hourly_rate', 'start_date', 'due_date'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            Database::update('projects', $updateData, 'id = ?', [$id]);
        }

        $updatedProject = Database::fetch("SELECT * FROM projects WHERE id = ?", [$id]);

        Response::success($updatedProject, 'Project updated successfully');
    }

    /**
     * DELETE /projects/:id
     */
    public static function destroy(int $id): void
    {
        AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin');

        $project = Database::fetch("SELECT id FROM projects WHERE id = ?", [$id]);
        if (!$project) {
            Response::notFound('Project not found');
        }

        // Archive instead of delete
        Database::update('projects', ['status' => 'archived'], 'id = ?', [$id]);

        Response::success(null, 'Project archived successfully');
    }

    /**
     * GET /projects/:id/members
     */
    public static function members(int $id): void
    {
        AuthMiddleware::authenticate();

        if (!AuthMiddleware::canAccessProject($id)) {
            Response::forbidden('You do not have access to this project');
        }

        $members = Database::fetchAll(
            "SELECT pm.*, u.name, u.email, u.avatar_url, u.designation, u.role as user_role
             FROM project_members pm
             INNER JOIN users u ON pm.user_id = u.id
             WHERE pm.project_id = ?
             ORDER BY pm.role, u.name",
            [$id]
        );

        Response::success($members);
    }

    /**
     * POST /projects/:id/members
     */
    public static function addMember(int $id): void
    {
        AuthMiddleware::authenticate();

        if (!AuthMiddleware::canManageProject($id)) {
            Response::forbidden('You do not have permission to add members');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('user_id')
            ->integer('user_id');

        $validator->validate();

        // Check user exists
        $user = Database::fetch("SELECT id FROM users WHERE id = ? AND is_active = 1", [$data['user_id']]);
        if (!$user) {
            Response::notFound('User not found');
        }

        // Check not already a member
        $existing = Database::fetch(
            "SELECT id FROM project_members WHERE project_id = ? AND user_id = ?",
            [$id, $data['user_id']]
        );

        if ($existing) {
            Response::error('User is already a member of this project', 400);
        }

        Database::insert('project_members', [
            'project_id' => $id,
            'user_id' => $data['user_id'],
            'role' => $data['role'] ?? 'member'
        ]);

        Response::created(null, 'Member added successfully');
    }

    /**
     * DELETE /projects/:id/members/:userId
     */
    public static function removeMember(int $id, int $userId): void
    {
        AuthMiddleware::authenticate();

        if (!AuthMiddleware::canManageProject($id)) {
            Response::forbidden('You do not have permission to remove members');
        }

        $member = Database::fetch(
            "SELECT id, role FROM project_members WHERE project_id = ? AND user_id = ?",
            [$id, $userId]
        );

        if (!$member) {
            Response::notFound('Member not found');
        }

        if ($member['role'] === 'owner') {
            Response::error('Cannot remove the project owner', 400);
        }

        Database::delete('project_members', 'project_id = ? AND user_id = ?', [$id, $userId]);

        Response::success(null, 'Member removed successfully');
    }

    /**
     * GET /projects/:id/columns
     */
    public static function columns(int $id): void
    {
        AuthMiddleware::authenticate();

        if (!AuthMiddleware::canAccessProject($id)) {
            Response::forbidden('You do not have access to this project');
        }

        $columns = Database::fetchAll(
            "SELECT * FROM kanban_columns WHERE project_id = ? ORDER BY position ASC",
            [$id]
        );

        Response::success($columns);
    }

    /**
     * POST /projects/:id/columns
     */
    public static function createColumn(int $id): void
    {
        AuthMiddleware::authenticate();

        if (!AuthMiddleware::canManageProject($id)) {
            Response::forbidden('You do not have permission to add columns');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('name')
            ->minLength('name', 1);

        $validator->validate();

        // Get next position
        $maxPos = Database::fetch(
            "SELECT MAX(position) as max_pos FROM kanban_columns WHERE project_id = ?",
            [$id]
        );

        $columnId = Database::insert('kanban_columns', [
            'project_id' => $id,
            'name' => $data['name'],
            'position' => ($maxPos['max_pos'] ?? -1) + 1,
            'color' => $data['color'] ?? '#7367F0',
            'is_done_column' => $data['is_done_column'] ?? false
        ]);

        $column = Database::fetch("SELECT * FROM kanban_columns WHERE id = ?", [$columnId]);

        Response::created($column, 'Column created successfully');
    }

    private static function generateProjectCode(): string
    {
        $year = date('Y');
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM projects WHERE code LIKE ?",
            ["%-{$year}-%"]
        );

        $num = str_pad(($result['count'] ?? 0) + 1, 3, '0', STR_PAD_LEFT);
        return "PRJ-{$year}-{$num}";
    }

    private static function createDefaultColumns(int $projectId, string $template): void
    {
        $columns = match ($template) {
            'video' => [
                ['Brief', '#7367F0', false],
                ['Script', '#9E95F5', false],
                ['Storyboard', '#00CFE8', false],
                ['Shoot', '#FF9F43', false],
                ['Rough Cut', '#28C76F', false],
                ['Color & Sound', '#7367F0', false],
                ['Client Review', '#FF9F43', false],
                ['Revisions', '#EA5455', false],
                ['Delivered', '#28C76F', true]
            ],
            'photography' => [
                ['Brief', '#7367F0', false],
                ['Shoot', '#FF9F43', false],
                ['Cull', '#00CFE8', false],
                ['Edit', '#9E95F5', false],
                ['Retouch', '#7367F0', false],
                ['Delivered', '#28C76F', true]
            ],
            'design' => [
                ['Brief', '#7367F0', false],
                ['Research', '#9E95F5', false],
                ['Concept', '#00CFE8', false],
                ['Design', '#FF9F43', false],
                ['Review', '#7367F0', false],
                ['Delivered', '#28C76F', true]
            ],
            default => [
                ['Backlog', '#7367F0', false],
                ['To Do', '#9E95F5', false],
                ['In Progress', '#00CFE8', false],
                ['Review', '#FF9F43', false],
                ['Done', '#28C76F', true]
            ]
        };

        foreach ($columns as $position => $col) {
            Database::insert('kanban_columns', [
                'project_id' => $projectId,
                'name' => $col[0],
                'position' => $position,
                'color' => $col[1],
                'is_done_column' => $col[2] ? 1 : 0
            ]);
        }
    }
}
