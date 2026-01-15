<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Services\NotificationService;

class NotificationController
{
    /**
     * GET /notifications
     */
    public static function index(): void
    {
        $user = AuthMiddleware::authenticate();

        $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';
        $limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));

        $notifications = NotificationService::getForUser($user['id'], $unreadOnly, $limit, $offset);
        $unreadCount = NotificationService::getUnreadCount($user['id']);

        Response::success([
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * PUT /notifications/:id/read
     */
    public static function markRead(int $id): void
    {
        $user = AuthMiddleware::authenticate();

        $result = NotificationService::markAsRead($id, $user['id']);

        if (!$result) {
            Response::notFound('Notification not found');
        }

        Response::success(null, 'Notification marked as read');
    }

    /**
     * PUT /notifications/read-all
     */
    public static function markAllRead(): void
    {
        $user = AuthMiddleware::authenticate();

        $count = NotificationService::markAllAsRead($user['id']);

        Response::success(['count' => $count], "Marked {$count} notifications as read");
    }
}
