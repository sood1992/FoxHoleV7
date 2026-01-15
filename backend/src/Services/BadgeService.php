<?php
namespace App\Services;

use App\Utils\Database;

class BadgeService
{
    /**
     * Check and award badges for a user
     */
    public static function checkAndAwardBadges(int $userId): array
    {
        $awardedBadges = [];
        $badges = Database::fetchAll("SELECT * FROM badges WHERE is_active = 1");

        foreach ($badges as $badge) {
            // Skip if already earned
            $existing = Database::fetch(
                "SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?",
                [$userId, $badge['id']]
            );

            if ($existing) {
                continue;
            }

            if (self::checkBadgeCriteria($userId, $badge)) {
                self::awardBadge($userId, $badge);
                $awardedBadges[] = $badge;
            }
        }

        return $awardedBadges;
    }

    /**
     * Award a specific badge to user
     */
    public static function awardBadge(int $userId, array $badge): void
    {
        Database::insert('user_badges', [
            'user_id' => $userId,
            'badge_id' => $badge['id']
        ]);

        // Award XP for badge
        if ($badge['xp_reward'] > 0) {
            XPService::awardBadge($userId, $badge);
        }

        // Send notification
        NotificationService::notifyBadgeEarned($userId, $badge);
    }

    /**
     * Get all badges for a user
     */
    public static function getUserBadges(int $userId): array
    {
        return Database::fetchAll(
            "SELECT b.*, ub.earned_at
             FROM badges b
             INNER JOIN user_badges ub ON b.id = ub.badge_id
             WHERE ub.user_id = ?
             ORDER BY ub.earned_at DESC",
            [$userId]
        );
    }

    /**
     * Get all available badges with user progress
     */
    public static function getAllBadgesWithProgress(int $userId): array
    {
        $badges = Database::fetchAll("SELECT * FROM badges WHERE is_active = 1 ORDER BY category, name");

        foreach ($badges as &$badge) {
            $earned = Database::fetch(
                "SELECT earned_at FROM user_badges WHERE user_id = ? AND badge_id = ?",
                [$userId, $badge['id']]
            );

            $badge['earned'] = $earned !== null;
            $badge['earned_at'] = $earned['earned_at'] ?? null;
            $badge['progress'] = self::getBadgeProgress($userId, $badge);
        }

        return $badges;
    }

    /**
     * Check if user meets badge criteria
     */
    private static function checkBadgeCriteria(int $userId, array $badge): bool
    {
        switch ($badge['criteria_type']) {
            case 'tasks_completed':
                return self::getTasksCompletedCount($userId) >= $badge['criteria_value'];

            case 'streak_days':
                $user = Database::fetch("SELECT current_streak_days FROM users WHERE id = ?", [$userId]);
                return ($user['current_streak_days'] ?? 0) >= $badge['criteria_value'];

            case 'level_reached':
                $user = Database::fetch("SELECT current_level FROM users WHERE id = ?", [$userId]);
                return ($user['current_level'] ?? 0) >= $badge['criteria_value'];

            case 'same_day_complete':
                return self::getSameDayCompletionCount($userId) >= $badge['criteria_value'];

            case 'first_approval':
                return self::getFirstApprovalCount($userId) >= $badge['criteria_value'];

            case 'video_projects':
                return self::getVideoProjectsCount($userId) >= $badge['criteria_value'];

            case 'days_active':
                $user = Database::fetch("SELECT DATEDIFF(NOW(), created_at) as days FROM users WHERE id = ?", [$userId]);
                return ($user['days'] ?? 0) >= $badge['criteria_value'];

            default:
                return false;
        }
    }

    /**
     * Get progress towards a badge
     */
    private static function getBadgeProgress(int $userId, array $badge): array
    {
        $current = 0;

        switch ($badge['criteria_type']) {
            case 'tasks_completed':
                $current = self::getTasksCompletedCount($userId);
                break;

            case 'streak_days':
                $user = Database::fetch("SELECT current_streak_days FROM users WHERE id = ?", [$userId]);
                $current = (int) ($user['current_streak_days'] ?? 0);
                break;

            case 'level_reached':
                $user = Database::fetch("SELECT current_level FROM users WHERE id = ?", [$userId]);
                $current = (int) ($user['current_level'] ?? 0);
                break;

            case 'same_day_complete':
                $current = self::getSameDayCompletionCount($userId);
                break;

            case 'first_approval':
                $current = self::getFirstApprovalCount($userId);
                break;

            case 'video_projects':
                $current = self::getVideoProjectsCount($userId);
                break;

            case 'days_active':
                $user = Database::fetch("SELECT DATEDIFF(NOW(), created_at) as days FROM users WHERE id = ?", [$userId]);
                $current = (int) ($user['days'] ?? 0);
                break;
        }

        return [
            'current' => $current,
            'target' => (int) $badge['criteria_value'],
            'percent' => min(100, round(($current / max(1, $badge['criteria_value'])) * 100))
        ];
    }

    private static function getTasksCompletedCount(int $userId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM tasks WHERE owner_id = ? AND status = 'complete'",
            [$userId]
        );
        return (int) ($result['count'] ?? 0);
    }

    private static function getSameDayCompletionCount(int $userId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM tasks
             WHERE owner_id = ? AND status = 'complete'
             AND DATE(completed_at) = DATE(created_at)",
            [$userId]
        );
        return (int) ($result['count'] ?? 0);
    }

    private static function getFirstApprovalCount(int $userId): int
    {
        // This would require tracking revision counts on tasks
        // For now, return 0 as placeholder
        return 0;
    }

    private static function getVideoProjectsCount(int $userId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(DISTINCT t.project_id) as count
             FROM tasks t
             INNER JOIN projects p ON t.project_id = p.id
             WHERE t.owner_id = ? AND t.status = 'complete' AND p.workflow_template = 'video'",
            [$userId]
        );
        return (int) ($result['count'] ?? 0);
    }
}
