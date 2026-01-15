<?php
namespace App\Services;

use App\Utils\Database;

class DependencyService
{
    /**
     * Check if adding a dependency would create a circular reference
     */
    public static function wouldCreateCycle(int $predecessorId, int $successorId): bool
    {
        // If predecessor is the same as successor, that's circular
        if ($predecessorId === $successorId) {
            return true;
        }

        // Check if successor has any path back to predecessor
        $visited = [];
        return self::hasPathTo($successorId, $predecessorId, $visited);
    }

    /**
     * Recursively check if there's a path from start to target through dependencies
     */
    private static function hasPathTo(int $start, int $target, array &$visited): bool
    {
        if ($start === $target) {
            return true;
        }

        if (in_array($start, $visited)) {
            return false;
        }

        $visited[] = $start;

        // Get all successors of current node
        $successors = Database::fetchAll(
            "SELECT successor_id FROM task_dependencies WHERE predecessor_id = ?",
            [$start]
        );

        foreach ($successors as $successor) {
            if (self::hasPathTo($successor['successor_id'], $target, $visited)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Add a dependency between tasks
     */
    public static function addDependency(int $predecessorId, int $successorId, string $type = 'FS', int $lagHours = 0): array
    {
        // Validate both tasks exist
        $predecessor = Database::fetch("SELECT id, title, project_id FROM tasks WHERE id = ?", [$predecessorId]);
        $successor = Database::fetch("SELECT id, title, project_id FROM tasks WHERE id = ?", [$successorId]);

        if (!$predecessor || !$successor) {
            return ['success' => false, 'error' => 'One or both tasks not found'];
        }

        // Check for circular dependency
        if (self::wouldCreateCycle($predecessorId, $successorId)) {
            return ['success' => false, 'error' => 'This would create a circular dependency'];
        }

        // Check if dependency already exists
        $existing = Database::fetch(
            "SELECT id FROM task_dependencies WHERE predecessor_id = ? AND successor_id = ?",
            [$predecessorId, $successorId]
        );

        if ($existing) {
            return ['success' => false, 'error' => 'Dependency already exists'];
        }

        // Create the dependency
        $id = Database::insert('task_dependencies', [
            'predecessor_id' => $predecessorId,
            'successor_id' => $successorId,
            'dependency_type' => $type,
            'lag_hours' => $lagHours
        ]);

        // Update successor status if predecessor is not complete
        if ($predecessor['status'] !== 'complete') {
            Database::update('tasks', ['status' => 'blocked'], 'id = ?', [$successorId]);
        }

        return [
            'success' => true,
            'id' => $id,
            'predecessor' => $predecessor,
            'successor' => $successor
        ];
    }

    /**
     * Remove a dependency
     */
    public static function removeDependency(int $dependencyId): bool
    {
        $dependency = Database::fetch(
            "SELECT successor_id FROM task_dependencies WHERE id = ?",
            [$dependencyId]
        );

        if (!$dependency) {
            return false;
        }

        Database::delete('task_dependencies', 'id = ?', [$dependencyId]);

        // Check if successor can be unblocked
        self::updateTaskBlockedStatus($dependency['successor_id']);

        return true;
    }

    /**
     * Get all blocking tasks (predecessors) for a task
     */
    public static function getBlockingTasks(int $taskId): array
    {
        return Database::fetchAll(
            "SELECT t.*, td.dependency_type, td.lag_hours, td.id as dependency_id
             FROM tasks t
             INNER JOIN task_dependencies td ON t.id = td.predecessor_id
             WHERE td.successor_id = ?
             ORDER BY t.due_date ASC",
            [$taskId]
        );
    }

    /**
     * Get all blocked tasks (successors) for a task
     */
    public static function getBlockedTasks(int $taskId): array
    {
        return Database::fetchAll(
            "SELECT t.*, td.dependency_type, td.lag_hours, td.id as dependency_id
             FROM tasks t
             INNER JOIN task_dependencies td ON t.id = td.successor_id
             WHERE td.predecessor_id = ?
             ORDER BY t.due_date ASC",
            [$taskId]
        );
    }

    /**
     * Check if all dependencies are met for a task
     */
    public static function allDependenciesMet(int $taskId): bool
    {
        $unmetCount = Database::fetch(
            "SELECT COUNT(*) as count
             FROM task_dependencies td
             INNER JOIN tasks t ON td.predecessor_id = t.id
             WHERE td.successor_id = ? AND t.status != 'complete'",
            [$taskId]
        );

        return (int) ($unmetCount['count'] ?? 0) === 0;
    }

    /**
     * Handle task completion - unlock dependent tasks
     */
    public static function handleTaskCompletion(int $taskId): array
    {
        $unlockedTasks = [];

        // Get completed task info for notifications
        $completedTask = Database::fetch(
            "SELECT id, title, project_id FROM tasks WHERE id = ?",
            [$taskId]
        );

        // Get all tasks waiting on this one
        $successors = Database::fetchAll(
            "SELECT t.*, td.id as dependency_id
             FROM tasks t
             INNER JOIN task_dependencies td ON t.id = td.successor_id
             WHERE td.predecessor_id = ?",
            [$taskId]
        );

        foreach ($successors as $successor) {
            // Check if all dependencies are now met
            if (self::allDependenciesMet($successor['id'])) {
                // Update status to ready
                Database::update('tasks', ['status' => 'ready'], 'id = ?', [$successor['id']]);

                // Notify the owner
                if ($successor['owner_id']) {
                    NotificationService::notifyTaskUnblocked(
                        $successor['owner_id'],
                        $successor,
                        $completedTask['title']
                    );
                }

                $unlockedTasks[] = $successor;
            }
        }

        return $unlockedTasks;
    }

    /**
     * Update a task's blocked status based on dependencies
     */
    public static function updateTaskBlockedStatus(int $taskId): void
    {
        $task = Database::fetch("SELECT status FROM tasks WHERE id = ?", [$taskId]);

        if (!$task || $task['status'] === 'complete') {
            return;
        }

        if (self::allDependenciesMet($taskId)) {
            // Only update if currently blocked
            if ($task['status'] === 'blocked') {
                Database::update('tasks', ['status' => 'ready'], 'id = ?', [$taskId]);
            }
        } else {
            // Block the task
            Database::update('tasks', ['status' => 'blocked'], 'id = ?', [$taskId]);
        }
    }

    /**
     * Get dependency graph for a project
     */
    public static function getProjectDependencyGraph(int $projectId): array
    {
        $tasks = Database::fetchAll(
            "SELECT id, title, status, owner_id, due_date FROM tasks WHERE project_id = ?",
            [$projectId]
        );

        $dependencies = Database::fetchAll(
            "SELECT td.* FROM task_dependencies td
             INNER JOIN tasks t ON td.successor_id = t.id
             WHERE t.project_id = ?",
            [$projectId]
        );

        return [
            'nodes' => $tasks,
            'edges' => $dependencies
        ];
    }
}
