<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;
use App\Services\NotificationService;

class ReviewController
{
    /**
     * POST /tasks/:taskId/review-portal
     */
    public static function createPortal(int $taskId): void
    {
        $user = AuthMiddleware::authenticate();

        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$taskId]);
        if (!$task) {
            Response::notFound('Task not found');
        }

        if (!AuthMiddleware::canManageProject($task['project_id'])) {
            Response::forbidden('You do not have permission to create review portals');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        // Generate unique token
        $token = bin2hex(random_bytes(32));

        $portalId = Database::insert('review_portals', [
            'task_id' => $taskId,
            'unique_token' => $token,
            'password_hash' => isset($data['password']) ? password_hash($data['password'], PASSWORD_DEFAULT) : null,
            'expires_at' => $data['expires_at'] ?? null,
            'allow_download' => isset($data['allow_download']) ? ($data['allow_download'] ? 1 : 0) : 0,
            'created_by' => $user['id']
        ]);

        $portal = Database::fetch("SELECT * FROM review_portals WHERE id = ?", [$portalId]);

        $appConfig = require __DIR__ . '/../../config/app.php';
        $portal['review_url'] = $appConfig['url'] . '/review/' . $token;

        Response::created($portal, 'Review portal created successfully');
    }

    /**
     * GET /review/:token (Public - no auth)
     */
    public static function getPortal(string $token): void
    {
        $portal = Database::fetch(
            "SELECT rp.*, t.title as task_title, p.name as project_name, p.client_name
             FROM review_portals rp
             INNER JOIN tasks t ON rp.task_id = t.id
             INNER JOIN projects p ON t.project_id = p.id
             WHERE rp.unique_token = ? AND rp.is_active = 1",
            [$token]
        );

        if (!$portal) {
            Response::notFound('Review portal not found or inactive');
        }

        // Check expiry
        if ($portal['expires_at'] && strtotime($portal['expires_at']) < time()) {
            Response::error('This review link has expired', 410);
        }

        // Check password if required
        if ($portal['password_hash']) {
            $providedPassword = $_GET['password'] ?? $_SERVER['HTTP_X_REVIEW_PASSWORD'] ?? null;

            if (!$providedPassword || !password_verify($providedPassword, $portal['password_hash'])) {
                Response::json([
                    'success' => false,
                    'requires_password' => true,
                    'message' => 'Password required'
                ], 401);
            }
        }

        // Get versions
        $portal['versions'] = Database::fetchAll(
            "SELECT rv.*, u.name as uploaded_by_name
             FROM review_versions rv
             LEFT JOIN users u ON rv.uploaded_by = u.id
             WHERE rv.portal_id = ?
             ORDER BY rv.version_number DESC",
            [$portal['id']]
        );

        // Get comments for each version
        foreach ($portal['versions'] as &$version) {
            $version['comments'] = Database::fetchAll(
                "SELECT * FROM review_comments WHERE version_id = ? ORDER BY timestamp_ms ASC, created_at ASC",
                [$version['id']]
            );
        }

        // Remove sensitive data
        unset($portal['password_hash']);

        Response::success($portal);
    }

    /**
     * POST /review/:token/comment (Public - no auth)
     */
    public static function addComment(string $token): void
    {
        $portal = Database::fetch(
            "SELECT * FROM review_portals WHERE unique_token = ? AND is_active = 1",
            [$token]
        );

        if (!$portal) {
            Response::notFound('Review portal not found');
        }

        // Check password
        if ($portal['password_hash']) {
            $providedPassword = $_SERVER['HTTP_X_REVIEW_PASSWORD'] ?? null;
            if (!$providedPassword || !password_verify($providedPassword, $portal['password_hash'])) {
                Response::unauthorized('Invalid password');
            }
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('version_id')
            ->integer('version_id')
            ->required('content')
            ->minLength('content', 1);

        $validator->validate();

        // Verify version belongs to this portal
        $version = Database::fetch(
            "SELECT id FROM review_versions WHERE id = ? AND portal_id = ?",
            [$data['version_id'], $portal['id']]
        );

        if (!$version) {
            Response::error('Invalid version', 400);
        }

        $commentId = Database::insert('review_comments', [
            'version_id' => $data['version_id'],
            'client_name' => $data['client_name'] ?? 'Client',
            'client_email' => $data['client_email'] ?? null,
            'content' => $data['content'],
            'timestamp_ms' => $data['timestamp_ms'] ?? null,
            'timestamp_end_ms' => $data['timestamp_end_ms'] ?? null,
            'position_x' => $data['position_x'] ?? null,
            'position_y' => $data['position_y'] ?? null
        ]);

        // Notify task owner
        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$portal['task_id']]);
        if ($task && $task['owner_id']) {
            NotificationService::notifyClientFeedback(
                $task['owner_id'],
                $task,
                substr($data['content'], 0, 100)
            );
        }

        $comment = Database::fetch("SELECT * FROM review_comments WHERE id = ?", [$commentId]);

        Response::created($comment, 'Comment added successfully');
    }

    /**
     * PUT /review/:token/approve (Public - no auth)
     */
    public static function approve(string $token): void
    {
        $portal = Database::fetch(
            "SELECT * FROM review_portals WHERE unique_token = ? AND is_active = 1",
            [$token]
        );

        if (!$portal) {
            Response::notFound('Review portal not found');
        }

        // Check password
        if ($portal['password_hash']) {
            $providedPassword = $_SERVER['HTTP_X_REVIEW_PASSWORD'] ?? null;
            if (!$providedPassword || !password_verify($providedPassword, $portal['password_hash'])) {
                Response::unauthorized('Invalid password');
            }
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('version_id')
            ->integer('version_id')
            ->required('action')
            ->in('action', ['approve', 'request_changes']);

        $validator->validate();

        // Verify version
        $version = Database::fetch(
            "SELECT * FROM review_versions WHERE id = ? AND portal_id = ?",
            [$data['version_id'], $portal['id']]
        );

        if (!$version) {
            Response::error('Invalid version', 400);
        }

        $task = Database::fetch("SELECT * FROM tasks WHERE id = ?", [$portal['task_id']]);

        if ($data['action'] === 'approve') {
            // Mark version as approved
            Database::update('review_versions', [
                'status' => 'approved',
                'approved_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$data['version_id']]);

            // Update task status to complete
            Database::update('tasks', [
                'status' => 'complete',
                'completed_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$portal['task_id']]);

            // Notify task owner
            if ($task && $task['owner_id']) {
                NotificationService::notifyClientApproved($task['owner_id'], $task);
            }

            Response::success(null, 'Version approved successfully');
        } else {
            // Mark as revision requested
            Database::update('review_versions', [
                'status' => 'revision_requested'
            ], 'id = ?', [$data['version_id']]);

            // Notify task owner
            if ($task && $task['owner_id']) {
                NotificationService::notifyClientFeedback(
                    $task['owner_id'],
                    $task,
                    'Changes requested on version ' . $version['version_number']
                );
            }

            Response::success(null, 'Revision requested');
        }
    }

    /**
     * GET /review-portals/:id (Internal - requires auth)
     */
    public static function show(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $portal = Database::fetch(
            "SELECT rp.*, t.title as task_title, t.project_id
             FROM review_portals rp
             INNER JOIN tasks t ON rp.task_id = t.id
             WHERE rp.id = ?",
            [$id]
        );

        if (!$portal) {
            Response::notFound('Review portal not found');
        }

        if (!AuthMiddleware::canAccessProject($portal['project_id'])) {
            Response::forbidden('You do not have access to this portal');
        }

        // Add versions and comments
        $portal['versions'] = Database::fetchAll(
            "SELECT rv.*, u.name as uploaded_by_name
             FROM review_versions rv
             LEFT JOIN users u ON rv.uploaded_by = u.id
             WHERE rv.portal_id = ?
             ORDER BY rv.version_number DESC",
            [$id]
        );

        foreach ($portal['versions'] as &$version) {
            $version['comments'] = Database::fetchAll(
                "SELECT * FROM review_comments WHERE version_id = ? ORDER BY created_at ASC",
                [$version['id']]
            );
        }

        $appConfig = require __DIR__ . '/../../config/app.php';
        $portal['review_url'] = $appConfig['url'] . '/review/' . $portal['unique_token'];

        Response::success($portal);
    }

    /**
     * POST /review-portals/:id/version (Internal - requires auth)
     */
    public static function uploadVersion(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $portal = Database::fetch(
            "SELECT rp.*, t.project_id FROM review_portals rp
             INNER JOIN tasks t ON rp.task_id = t.id
             WHERE rp.id = ?",
            [$id]
        );

        if (!$portal) {
            Response::notFound('Review portal not found');
        }

        if (!AuthMiddleware::canAccessProject($portal['project_id'])) {
            Response::forbidden('You do not have access to this portal');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('file_path');

        $validator->validate();

        // Get next version number
        $maxVersion = Database::fetch(
            "SELECT MAX(version_number) as max_v FROM review_versions WHERE portal_id = ?",
            [$id]
        );

        $versionId = Database::insert('review_versions', [
            'portal_id' => $id,
            'version_number' => ($maxVersion['max_v'] ?? 0) + 1,
            'file_path' => $data['file_path'],
            'file_type' => $data['file_type'] ?? 'video/mp4',
            'notes' => $data['notes'] ?? null,
            'uploaded_by' => $user['id']
        ]);

        $version = Database::fetch("SELECT * FROM review_versions WHERE id = ?", [$versionId]);

        Response::created($version, 'Version uploaded successfully');
    }
}
