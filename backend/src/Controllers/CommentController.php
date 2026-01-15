<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;
use App\Services\NotificationService;

class CommentController
{
    /**
     * GET /tasks/:taskId/comments
     */
    public static function index(int $taskId): void
    {
        $user = AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT project_id FROM tasks WHERE id = ?", [$taskId]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        $comments = Database::fetchAll(
            "SELECT c.*, u.name as user_name, u.avatar_url
             FROM comments c
             INNER JOIN users u ON c.user_id = u.id
             WHERE c.task_id = ?
             ORDER BY c.created_at ASC",
            [$taskId]
        );

        // Build threaded structure
        $threaded = [];
        $byId = [];

        foreach ($comments as $comment) {
            $comment['replies'] = [];
            $byId[$comment['id']] = $comment;
        }

        foreach ($byId as $id => $comment) {
            if ($comment['parent_comment_id']) {
                if (isset($byId[$comment['parent_comment_id']])) {
                    $byId[$comment['parent_comment_id']]['replies'][] = &$byId[$id];
                }
            } else {
                $threaded[] = &$byId[$id];
            }
        }

        Response::success($threaded);
    }

    /**
     * POST /tasks/:taskId/comments
     */
    public static function store(int $taskId): void
    {
        $user = AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$taskId]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canAccessProject($task['project_id'])) {
            Response::forbidden('You do not have access to this task');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('content')
            ->minLength('content', 1);

        $validator->validate();

        $commentId = Database::insert('comments', [
            'task_id' => $taskId,
            'user_id' => $user['id'],
            'content' => $data['content'],
            'parent_comment_id' => $data['parent_comment_id'] ?? null
        ]);

        // Check for @mentions
        preg_match_all('/@(\w+)/', $data['content'], $matches);

        if (!empty($matches[1])) {
            $mentionedUsers = Database::fetchAll(
                "SELECT id, name FROM users WHERE name IN (" .
                implode(',', array_fill(0, count($matches[1]), '?')) .
                ") AND id != ?",
                [...$matches[1], $user['id']]
            );

            foreach ($mentionedUsers as $mentioned) {
                NotificationService::notifyMention(
                    $mentioned['id'],
                    $user['id'],
                    $user['name'],
                    $task
                );
            }
        }

        // Notify task owner if different from commenter
        if ($task['owner_id'] && $task['owner_id'] != $user['id']) {
            NotificationService::create(
                $task['owner_id'],
                'comment_added',
                'New Comment',
                "{$user['name']} commented on \"{$task['title']}\"",
                'task',
                $taskId
            );
        }

        $comment = Database::fetch(
            "SELECT c.*, u.name as user_name, u.avatar_url
             FROM comments c
             INNER JOIN users u ON c.user_id = u.id
             WHERE c.id = ?",
            [$commentId]
        );

        Response::created($comment, 'Comment added successfully');
    }

    /**
     * PUT /comments/:id
     */
    public static function update(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $comment = Database::fetch("SELECT * FROM comments WHERE id = ?", [$id]);
        if (!$comment) {
            Response::notFound('Comment not found');
        }

        // Can only edit own comments
        if ($comment['user_id'] !== $user['id']) {
            Response::forbidden('You can only edit your own comments');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('content')
            ->minLength('content', 1);

        $validator->validate();

        Database::update('comments', [
            'content' => $data['content']
        ], 'id = ?', [$id]);

        $updatedComment = Database::fetch(
            "SELECT c.*, u.name as user_name, u.avatar_url
             FROM comments c
             INNER JOIN users u ON c.user_id = u.id
             WHERE c.id = ?",
            [$id]
        );

        Response::success($updatedComment, 'Comment updated successfully');
    }

    /**
     * DELETE /comments/:id
     */
    public static function destroy(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $comment = Database::fetch("SELECT * FROM comments WHERE id = ?", [$id]);
        if (!$comment) {
            Response::notFound('Comment not found');
        }

        // Can delete own comments or admin can delete any
        if ($comment['user_id'] !== $user['id'] && !AuthMiddleware::isAdmin()) {
            Response::forbidden('You can only delete your own comments');
        }

        Database::delete('comments', 'id = ?', [$id]);

        Response::success(null, 'Comment deleted successfully');
    }
}
