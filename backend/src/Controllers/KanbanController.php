<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;

class KanbanController
{
    /**
     * PUT /columns/:id
     */
    public static function updateColumn(int $id): void
    {
        AuthMiddleware::authenticate();

        $column = Database::fetch(
            "SELECT * FROM kanban_columns WHERE id = ?",
            [$id]
        );

        if (!$column) {
            Response::notFound('Column not found');
        }

        if (!AuthMiddleware::canManageProject($column['project_id'])) {
            Response::forbidden('You do not have permission to update this column');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $updateData = [];
        $allowedFields = ['name', 'color', 'is_done_column'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            Database::update('kanban_columns', $updateData, 'id = ?', [$id]);
        }

        $updatedColumn = Database::fetch("SELECT * FROM kanban_columns WHERE id = ?", [$id]);

        Response::success($updatedColumn, 'Column updated successfully');
    }

    /**
     * DELETE /columns/:id
     */
    public static function deleteColumn(int $id): void
    {
        AuthMiddleware::authenticate();

        $column = Database::fetch(
            "SELECT * FROM kanban_columns WHERE id = ?",
            [$id]
        );

        if (!$column) {
            Response::notFound('Column not found');
        }

        if (!AuthMiddleware::canManageProject($column['project_id'])) {
            Response::forbidden('You do not have permission to delete this column');
        }

        // Check if column has tasks
        $taskCount = Database::fetch(
            "SELECT COUNT(*) as count FROM tasks WHERE column_id = ?",
            [$id]
        );

        if ($taskCount['count'] > 0) {
            Response::error('Cannot delete column with tasks. Move tasks first.', 400);
        }

        // Check if this is the last column
        $columnCount = Database::fetch(
            "SELECT COUNT(*) as count FROM kanban_columns WHERE project_id = ?",
            [$column['project_id']]
        );

        if ($columnCount['count'] <= 1) {
            Response::error('Cannot delete the last column', 400);
        }

        Database::delete('kanban_columns', 'id = ?', [$id]);

        // Reorder remaining columns
        Database::query(
            "UPDATE kanban_columns SET position = position - 1
             WHERE project_id = ? AND position > ?",
            [$column['project_id'], $column['position']]
        );

        Response::success(null, 'Column deleted successfully');
    }

    /**
     * PUT /columns/reorder
     */
    public static function reorderColumns(): void
    {
        AuthMiddleware::authenticate();

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['columns']) || !is_array($data['columns'])) {
            Response::error('columns array required', 400);
        }

        // Verify first column for permissions
        $firstColumn = Database::fetch(
            "SELECT project_id FROM kanban_columns WHERE id = ?",
            [$data['columns'][0]['id'] ?? 0]
        );

        if (!$firstColumn) {
            Response::error('Invalid column', 400);
        }

        if (!AuthMiddleware::canManageProject($firstColumn['project_id'])) {
            Response::forbidden('You do not have permission to reorder columns');
        }

        Database::beginTransaction();

        try {
            foreach ($data['columns'] as $index => $col) {
                Database::update('kanban_columns', [
                    'position' => $index
                ], 'id = ? AND project_id = ?', [$col['id'], $firstColumn['project_id']]);
            }

            Database::commit();

            $columns = Database::fetchAll(
                "SELECT * FROM kanban_columns WHERE project_id = ? ORDER BY position",
                [$firstColumn['project_id']]
            );

            Response::success($columns, 'Columns reordered successfully');

        } catch (\Exception $e) {
            Database::rollback();
            Response::serverError('Failed to reorder columns');
        }
    }

    /**
     * GET /projects/:projectId/kanban
     * Full kanban board data with tasks grouped by column
     */
    public static function getBoard(int $projectId): void
    {
        $user = AuthMiddleware::authenticate();

        if (!AuthMiddleware::canAccessProject($projectId)) {
            Response::forbidden('You do not have access to this project');
        }

        // Get columns
        $columns = Database::fetchAll(
            "SELECT * FROM kanban_columns WHERE project_id = ? ORDER BY position",
            [$projectId]
        );

        // Get all tasks with details
        $tasks = Database::fetchAll(
            "SELECT t.*, u.name as owner_name, u.avatar_url as owner_avatar
             FROM tasks t
             LEFT JOIN users u ON t.owner_id = u.id
             WHERE t.project_id = ? AND t.parent_task_id IS NULL
             ORDER BY t.position",
            [$projectId]
        );

        // Get all dependencies for this project
        $dependencies = Database::fetchAll(
            "SELECT td.* FROM task_dependencies td
             INNER JOIN tasks t ON td.successor_id = t.id
             WHERE t.project_id = ?",
            [$projectId]
        );

        // Build dependency lookup
        $taskDependencies = [];
        foreach ($dependencies as $dep) {
            if (!isset($taskDependencies[$dep['successor_id']])) {
                $taskDependencies[$dep['successor_id']] = [];
            }
            $taskDependencies[$dep['successor_id']][] = $dep['predecessor_id'];
        }

        // Group tasks by column and add dependency info
        $tasksByColumn = [];
        foreach ($columns as $col) {
            $tasksByColumn[$col['id']] = [];
        }

        foreach ($tasks as $task) {
            $task['dependencies'] = $taskDependencies[$task['id']] ?? [];
            $task['dependency_count'] = count($task['dependencies']);

            // Check if blocked
            $unmetDeps = 0;
            foreach ($task['dependencies'] as $depId) {
                $depTask = array_filter($tasks, fn($t) => $t['id'] == $depId);
                $depTask = reset($depTask);
                if ($depTask && $depTask['status'] !== 'complete') {
                    $unmetDeps++;
                }
            }
            $task['is_blocked'] = $unmetDeps > 0;
            $task['unmet_dependencies'] = $unmetDeps;

            if (isset($tasksByColumn[$task['column_id']])) {
                $tasksByColumn[$task['column_id']][] = $task;
            }
        }

        // Build response
        $board = [];
        foreach ($columns as $col) {
            $board[] = [
                'column' => $col,
                'tasks' => $tasksByColumn[$col['id']] ?? []
            ];
        }

        Response::success($board);
    }
}
