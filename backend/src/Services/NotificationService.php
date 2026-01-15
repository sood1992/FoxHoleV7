<?php
namespace App\Services;

use App\Utils\Database;

class NotificationService
{
    /**
     * Create a new notification
     */
    public static function create(
        int $userId,
        string $type,
        string $title,
        string $content,
        ?string $referenceType = null,
        ?int $referenceId = null,
        bool $sendWhatsApp = false
    ): int {
        $id = Database::insert('notifications', [
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'content' => $content,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'sent_via_whatsapp' => $sendWhatsApp ? 1 : 0
        ]);

        // Send WhatsApp if required and configured
        if ($sendWhatsApp) {
            self::sendWhatsApp($userId, $title, $content);
        }

        return $id;
    }

    /**
     * Get notifications for user
     */
    public static function getForUser(int $userId, bool $unreadOnly = false, int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT * FROM notifications WHERE user_id = ?";
        $params = [$userId];

        if ($unreadOnly) {
            $sql .= " AND is_read = 0";
        }

        $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        return Database::fetchAll($sql, $params);
    }

    /**
     * Get unread count for user
     */
    public static function getUnreadCount(int $userId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
            [$userId]
        );

        return (int) ($result['count'] ?? 0);
    }

    /**
     * Mark notification as read
     */
    public static function markAsRead(int $notificationId, int $userId): bool
    {
        return Database::update(
            'notifications',
            ['is_read' => 1],
            'id = ? AND user_id = ?',
            [$notificationId, $userId]
        ) > 0;
    }

    /**
     * Mark all notifications as read for user
     */
    public static function markAllAsRead(int $userId): int
    {
        return Database::update(
            'notifications',
            ['is_read' => 1],
            'user_id = ? AND is_read = 0',
            [$userId]
        );
    }

    /**
     * Notification templates
     */
    public static function notifyTaskAssigned(int $userId, array $task, string $assignerName): void
    {
        self::create(
            $userId,
            'task_assigned',
            'New Task Assigned',
            "You have been assigned \"{$task['title']}\" by {$assignerName}",
            'task',
            $task['id'],
            true // Send via WhatsApp
        );
    }

    public static function notifyTaskUnblocked(int $userId, array $task, string $predecessorTitle): void
    {
        self::create(
            $userId,
            'task_unblocked',
            'Task Unlocked',
            "\"{$task['title']}\" is now ready to start. (Blocked by \"{$predecessorTitle}\" completed)",
            'task',
            $task['id'],
            true
        );
    }

    public static function notifyTaskDueSoon(int $userId, array $task, int $hoursUntilDue): void
    {
        $timeStr = $hoursUntilDue <= 24 ? "{$hoursUntilDue} hours" : round($hoursUntilDue / 24) . " days";

        self::create(
            $userId,
            'task_due_soon',
            'Task Due Soon',
            "\"{$task['title']}\" is due in {$timeStr}",
            'task',
            $task['id'],
            $hoursUntilDue <= 24
        );
    }

    public static function notifyClientFeedback(int $userId, array $task, string $feedbackPreview): void
    {
        self::create(
            $userId,
            'client_feedback',
            'New Client Feedback',
            "New feedback on \"{$task['title']}\": \"{$feedbackPreview}\"",
            'task',
            $task['id'],
            true
        );
    }

    public static function notifyClientApproved(int $userId, array $task): void
    {
        self::create(
            $userId,
            'client_approved',
            'Task Approved!',
            "Client approved \"{$task['title']}\" without changes!",
            'task',
            $task['id'],
            false
        );
    }

    public static function notifyShootReminder(int $userId, array $shoot): void
    {
        self::create(
            $userId,
            'shoot_reminder',
            'Shoot Reminder',
            "Reminder: \"{$shoot['title']}\" is scheduled for tomorrow at {$shoot['call_time']}",
            'shoot',
            $shoot['id'],
            true
        );
    }

    public static function notifyMention(int $userId, int $mentionerId, string $mentionerName, array $task): void
    {
        self::create(
            $userId,
            'mentioned',
            'You were mentioned',
            "{$mentionerName} mentioned you in a comment on \"{$task['title']}\"",
            'task',
            $task['id'],
            true
        );
    }

    public static function notifyBadgeEarned(int $userId, array $badge): void
    {
        self::create(
            $userId,
            'badge_earned',
            'Badge Earned!',
            "You earned the \"{$badge['name']}\" badge! {$badge['icon']}",
            'badge',
            $badge['id'],
            false
        );
    }

    /**
     * Send WhatsApp message (placeholder for Twilio integration)
     */
    private static function sendWhatsApp(int $userId, string $title, string $content): void
    {
        $config = require __DIR__ . '/../../config/app.php';

        if (empty($config['twilio']['sid']) || empty($config['twilio']['auth_token'])) {
            return; // Twilio not configured
        }

        $user = Database::fetch("SELECT phone FROM users WHERE id = ?", [$userId]);

        if (!$user || empty($user['phone'])) {
            return;
        }

        // Format message
        $message = "{$title}\n\n{$content}";

        // Here you would integrate with Twilio API
        // For now, we'll just log the attempt
        error_log("WhatsApp notification to {$user['phone']}: {$message}");

        // Twilio integration example (commented out):
        /*
        $twilio = new \Twilio\Rest\Client($config['twilio']['sid'], $config['twilio']['auth_token']);

        try {
            $twilio->messages->create(
                "whatsapp:{$user['phone']}",
                [
                    'from' => "whatsapp:{$config['twilio']['whatsapp_number']}",
                    'body' => $message
                ]
            );
        } catch (\Exception $e) {
            error_log("WhatsApp send failed: " . $e->getMessage());
        }
        */
    }
}
