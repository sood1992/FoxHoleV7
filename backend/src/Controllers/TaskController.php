<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;
use App\Services\DependencyService;
use App\Services\NotificationService;
use App\Services\XPService;
use App\Services\BadgeService;

class TaskController
{
    /**
     * GET /projects/:projectId/tasks
     */
    public static function index(int $projectId): void
    {
        $user = AuthMiddleware::authenticate();

        if (!AuthMiddleware::canAccessProject($projectId)) {
            Response::forbidden('You do not have access to this project');
        }

        $tasks = Database::fetchAll(
            "SELECT t.*, u.name as owner_name, u.avatar_url as owner_avatar,
                    kc.name as column_name, kc.color as column_color
             FROM tasks t
             LEFT JOIN users u ON t.owner_id = u.id
             LEFT JOIN kanban_columns kc ON t.column_id = kc.id
             WHERE t.project_id = ?
             ORDER BY kc.position, t.position",
            [$projectId]
        );

        // Add dependency info
        foreach ($tasks as &$task) {
            $blocking = Database::fetchAll(
                "SELECT t.id, t.title, t.status FROM tasks t
                 INNER JOIN task_dependencies td ON t.id = td.predecessor_id
                 WHERE td.successor_id = ?",
                [$task['id']]
            );

            $task['blocking_tasks'] = $blocking;
            $task['is_blocked'] = count(array_filter($blocking, fn($t) => $t['status'] !== 'complete')) > 0;
        }

        Response::success($tasks);
    }

    /**
     * GET /tasks/:id
     */
    public static function show(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $task = Database::fetch(
            "SELECT t.*, p.name as project_name, p.code as project_code,
                    u.name as owner_name, u.avatar_url as owner_avatar,
                    c.name as created_by_name,
                    kc.name as column_name, kc.color as column_color
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN users u ON t.owner_id = u.id
             LEFT JOIN users c ON t.created_by = c.id
             LEFT JOIN kanban_columns kc ON t.column_id = kc.id
             WHERE t.id = ?",
            [$id]
        );

        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        // Get contributors
        $task['contributors'] = Database::fetchAll(
            "SELECT tc.*, u.name, u.email, u.avatar_url
             FROM task_contributors tc
             INNER JOIN users u ON tc.user_id = u.id
             WHERE tc.task_id = ?",
            [$id]
        );

        // Get dependencies
        $task['blocked_by'] = DependencyService::getBlockingTasks($id);
        $task['blocking'] = DependencyService::getBlockedTasks($id);

        // Get subtasks
        $task['subtasks'] = Database::fetchAll(
            "SELECT id, title, status, owner_id, due_date FROM tasks
             WHERE parent_task_id = ? ORDER BY position",
            [$id]
        );

        // Get comments
        $task['comments'] = Database::fetchAll(
            "SELECT c.*, u.name as user_name, u.avatar_url
             FROM comments c
             INNER JOIN users u ON c.user_id = u.id
             WHERE c.task_id = ?
             ORDER BY c.created_at ASC",
            [$id]
        );

        // Get time entries
        $task['time_entries'] = Database::fetchAll(
            "SELECT te.*, u.name as user_name
             FROM time_entries te
             INNER JOIN users u ON te.user_id = u.id
             WHERE te.task_id = ?
             ORDER BY te.date DESC, te.created_at DESC
             LIMIT 10",
            [$id]
        );

        // Get attachments
        $task['attachments'] = Database::fetchAll(
            "SELECT a.*, u.name as uploaded_by_name
             FROM attachments a
             LEFT JOIN users u ON a.uploaded_by = u.id
             WHERE a.attachable_type = 'task' AND a.attachable_id = ?
             ORDER BY a.created_at DESC",
            [$id]
        );

        Response::success($task);
    }

    /**
     * POST /tasks
     */
    public static function store(): void
    {
        $user = AuthMiddleware::authenticate();

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('project_id')
            ->integer('project_id')
            ->required('title')
            ->minLength('title', 1);

        $validator->validate();

        if (!AuthMiddleware::canAccessProject($data['project_id'])) {
            Response::forbidden('You do not have access to this project');
        }

        // Get first column if not specified
        $columnId = $data['column_id'] ?? null;
        if (!$columnId) {
            $column = Database::fetch(
                "SELECT id FROM kanban_columns WHERE project_id = ? ORDER BY position LIMIT 1",
                [$data['project_id']]
            );
            $columnId = $column['id'] ?? null;
        }

        if (!$columnId) {
            Response::error('No columns found for this project', 400);
        }

        // Get next position in column
        $maxPos = Database::fetch(
            "SELECT MAX(position) as max_pos FROM tasks WHERE column_id = ?",
            [$columnId]
        );

        // Determine if self-created
        $isSelfCreated = !isset($data['owner_id']) || $data['owner_id'] == $user['id'];

        $taskId = Database::insert('tasks', [
            'project_id' => $data['project_id'],
            'column_id' => $columnId,
            'parent_task_id' => $data['parent_task_id'] ?? null,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'priority' => $data['priority'] ?? 'medium',
            'complexity' => $data['complexity'] ?? 'medium',
            'status' => 'ready',
            'owner_id' => $data['owner_id'] ?? $user['id'],
            'estimated_hours' => $data['estimated_hours'] ?? null,
            'start_date' => $data['start_date'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'position' => ($maxPos['max_pos'] ?? -1) + 1,
            'is_self_created' => $isSelfCreated ? 1 : 0,
            'created_by' => $user['id']
        ]);

        // Notify assignee if different from creator
        if (isset($data['owner_id']) && $data['owner_id'] != $user['id']) {
            $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$taskId]);
            NotificationService::notifyTaskAssigned($data['owner_id'], $task, $user['name']);
        }

        $task = Database::fetch(
            "SELECT t.*, u.name as owner_name
             FROM tasks t
             LEFT JOIN users u ON t.owner_id = u.id
             WHERE t.id = ?",
            [$taskId]
        );

        Response::created($task, 'Task created successfully');
    }

    /**
     * PUT /tasks/:id
     */
    public static function update(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$id]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canManageTask($id)) {
            Response::forbidden('You do not have permission to update this task');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data);

        if (isset($data['priority'])) {
            $validator->in('priority', ['low', 'medium', 'high', 'urgent']);
        }
        if (isset($data['complexity'])) {
            $validator->in('complexity', ['trivial', 'simple', 'medium', 'complex', 'epic']);
        }

        $validator->validate();

        $updateData = [];
        $allowedFields = ['title', 'description', 'priority', 'complexity', 'owner_id', 'estimated_hours', 'start_date', 'due_date'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        // Notify new owner if changed
        if (isset($data['owner_id']) && $data['owner_id'] != $task['owner_id']) {
            $updatedTask = array_merge($task, $updateData);
            NotificationService::notifyTaskAssigned($data['owner_id'], $updatedTask, $user['name']);
        }

        if (!empty($updateData)) {
            Database::update('tasks', $updateData, 'id = ?', [$id]);
        }

        $updatedTask = Database::fetch(
            "SELECT t.*, u.name as owner_name
             FROM tasks t
             LEFT JOIN users u ON t.owner_id = u.id
             WHERE t.id = ?",
            [$id]
        );

        Response::success($updatedTask, 'Task updated successfully');
    }

    /**
     * DELETE /tasks/:id
     */
    public static function destroy(int $id): void
    {
        AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$id]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canManageTask($id)) {
            Response::forbidden('You do not have permission to delete this task');
        }

        Database::delete('tasks', 'id = ?', [$id]);

        Response::success(null, 'Task deleted successfully');
    }

    /**
     * PUT /tasks/:id/move
     */
    public static function move(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$id]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('column_id')
            ->integer('column_id')
            ->required('position')
            ->integer('position');

        $validator->validate();

        // Verify column belongs to same project
        $column = Database::fetch(
            "SELECT id, is_done_column FROM kanban_columns WHERE id = ? AND project_id = ?",
            [$data['column_id'], $task['project_id']]
        );

        if (!$column) {
            Response::error('Invalid column', 400);
        }

        // Check if task is blocked
        if ($task['status'] === 'blocked' && !DependencyService::allDependenciesMet($id)) {
            Response::error('Cannot move blocked task until dependencies are complete', 400);
        }

        Database::beginTransaction();

        try {
            // Reorder tasks in old column
            Database::query(
                "UPDATE tasks SET position = position - 1
                 WHERE column_id = ? AND position > ?",
                [$task['column_id'], $task['position']]
            );

            // Make room in new column
            Database::query(
                "UPDATE tasks SET position = position + 1
                 WHERE column_id = ? AND position >= ?",
                [$data['column_id'], $data['position']]
            );

            // Move the task
            $newStatus = $task['status'];
            $completedAt = $task['completed_at'];

            // If moving to done column, mark as complete
            if ($column['is_done_column'] && $task['status'] !== 'complete') {
                $newStatus = 'complete';
                $completedAt = date('Y-m-d H:i:s');

                // Award XP
                if ($task['owner_id']) {
                    XPService::awardTaskCompletion($task['owner_id'], $task);
                    BadgeService::checkAndAwardBadges($task['owner_id']);
                }

                // Unlock dependent tasks
                DependencyService::handleTaskCompletion($id);
            }

            Database::update('tasks', [
                'column_id' => $data['column_id'],
                'position' => $data['position'],
                'status' => $newStatus,
                'completed_at' => $completedAt
            ], 'id = ?', [$id]);

            Database::commit();

            $updatedTask = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$id]);

            Response::success($updatedTask, 'Task moved successfully');

        } catch (\Exception $e) {
            Database::rollback();
            Response::serverError('Failed to move task');
        }
    }

    /**
     * PUT /tasks/:id/status
     */
    public static function updateStatus(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$id]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('status')
            ->in('status', ['blocked', 'ready', 'in_progress', 'review', 'complete']);

        $validator->validate();

        $newStatus = $data['status'];

        // Can't manually set to blocked
        if ($newStatus === 'blocked') {
            Response::error('Status is controlled by dependencies', 400);
        }

        // Check if can move out of blocked
        if ($task['status'] === 'blocked' && !DependencyService::allDependenciesMet($id)) {
            Response::error('Cannot change status - task is blocked by dependencies', 400);
        }

        $updateData = ['status' => $newStatus];

        if ($newStatus === 'complete') {
            $updateData['completed_at'] = date('Y-m-d H:i:s');

            // Award XP
            if ($task['owner_id']) {
                XPService::awardTaskCompletion($task['owner_id'], $task);
                BadgeService::checkAndAwardBadges($task['owner_id']);
            }

            // Unlock dependent tasks
            DependencyService::handleTaskCompletion($id);
        }

        Database::update('tasks', $updateData, 'id = ?', [$id]);

        $updatedTask = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$id]);

        Response::success($updatedTask, 'Status updated successfully');
    }

    /**
     * GET /my-tasks
     */
    public static function myTasks(): void
    {
        $user = AuthMiddleware::authenticate();

        $tasks = Database::fetchAll(
            "SELECT t.*, p.name as project_name, p.code as project_code,
                    kc.name as column_name, kc.color as column_color
             FROM tasks t
             INNER JOIN projects p ON t.project_id = p.id
             LEFT JOIN kanban_columns kc ON t.column_id = kc.id
             WHERE t.owner_id = ? AND t.status != 'complete'
             ORDER BY
                CASE t.priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                t.due_date ASC",
            [$user['id']]
        );

        Response::success($tasks);
    }

    /**
     * GET /tasks/:id/dependencies
     */
    public static function dependencies(int $id): void
    {
        AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT project_id FROM tasks WHERE id = ?", [$id]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        Response::success([
            'blocked_by' => DependencyService::getBlockingTasks($id),
            'blocking' => DependencyService::getBlockedTasks($id)
        ]);
    }

    /**
     * POST /tasks/:id/dependencies
     */
    public static function addDependency(int $id): void
    {
        AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT project_id FROM tasks WHERE id = ?", [$id]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canManageProject($task['project_id'])) {
            Response::forbidden('You do not have permission to manage dependencies');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('predecessor_id')
            ->integer('predecessor_id');

        $validator->validate();

        $result = DependencyService::addDependency(
            $data['predecessor_id'],
            $id,
            $data['type'] ?? 'FS',
            $data['lag_hours'] ?? 0
        );

        if (!$result['success']) {
            Response::error($result['error'], 400);
        }

        Response::created($result, 'Dependency added successfully');
    }

    /**
     * DELETE /dependencies/:id
     */
    public static function removeDependency(int $dependencyId): void
    {
        AuthMiddleware::authenticate();

        $dependency = Database::fetch(
            "SELECT td.*, t.project_id
             FROM task_dependencies td
             INNER JOIN tasks t ON td.successor_id = t.id
             WHERE td.id = ?",
            [$dependencyId]
        );

        if (!$dependency) {
            Response::notFound('Dependency not found');
        }

        if (!AuthMiddleware::canManageProject($dependency['project_id'])) {
            Response::forbidden('You do not have permission to manage dependencies');
        }

        DependencyService::removeDependency($dependencyId);

        Response::success(null, 'Dependency removed successfully');
    }
}
