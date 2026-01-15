<?php
namespace App\Services;

use App\Utils\Database;

class XPService
{
    private static array $xpConfig;

    private static function getConfig(): array
    {
        if (!isset(self::$xpConfig)) {
            $config = require __DIR__ . '/../../config/app.php';
            self::$xpConfig = $config['xp'];
        }
        return self::$xpConfig;
    }

    /**
     * Award XP for task completion
     */
    public static function awardTaskCompletion(int $userId, array $task): int
    {
        $config = self::getConfig();

        // Base XP based on complexity
        $complexityKey = 'task_complete_' . $task['complexity'];
        $baseXP = $config[$complexityKey] ?? $config['task_complete_medium'];

        $multiplier = 1.0;

        // On-time bonus
        if ($task['due_date'] && strtotime($task['due_date']) >= strtotime('today')) {
            $multiplier *= $config['on_time_multiplier'];
        } elseif ($task['due_date'] && strtotime($task['due_date']) < strtotime('today')) {
            // Late penalty
            $multiplier *= $config['late_multiplier'];
        }

        // First task of day bonus
        if (self::isFirstTaskOfDay($userId)) {
            $baseXP += $config['first_task_of_day'];
        }

        $xpAwarded = (int) round($baseXP * $multiplier);

        // Record XP transaction
        self::recordTransaction($userId, $xpAwarded, "Completed: {$task['title']}", 'task', $task['id']);

        // Update user totals and check for level up
        self::updateUserXP($userId);

        // Update streak
        self::updateStreak($userId);

        return $xpAwarded;
    }

    /**
     * Award XP for earning a badge
     */
    public static function awardBadge(int $userId, array $badge): int
    {
        if ($badge['xp_reward'] > 0) {
            self::recordTransaction(
                $userId,
                $badge['xp_reward'],
                "Badge earned: {$badge['name']}",
                'badge',
                $badge['id']
            );
            self::updateUserXP($userId);
        }

        return $badge['xp_reward'];
    }

    /**
     * Award streak bonus
     */
    public static function awardStreakBonus(int $userId, int $streakDays): int
    {
        $config = self::getConfig();
        $xp = 0;

        if ($streakDays == 3) {
            $xp = $config['streak_day_3'];
        } elseif ($streakDays == 7) {
            $xp = $config['streak_day_7'];
        } elseif ($streakDays == 30) {
            $xp = $config['streak_day_30'];
        }

        if ($xp > 0) {
            self::recordTransaction($userId, $xp, "{$streakDays}-day streak bonus", 'streak', $streakDays);
            self::updateUserXP($userId);
        }

        return $xp;
    }

    /**
     * Calculate level from total XP
     */
    public static function calculateLevel(int $totalXP): int
    {
        $level = 1;
        $xpNeeded = 0;

        while ($xpNeeded <= $totalXP) {
            $level++;
            // Formula: XP needed = 100 + (level * 20) + (level^1.5 * 10)
            $xpNeeded += 100 + ($level * 20) + (int)(pow($level, 1.5) * 10);
        }

        return $level - 1;
    }

    /**
     * Get XP needed for next level
     */
    public static function getXPForNextLevel(int $currentLevel): int
    {
        $level = $currentLevel + 1;
        return 100 + ($level * 20) + (int)(pow($level, 1.5) * 10);
    }

    /**
     * Get level title
     */
    public static function getLevelTitle(int $level): string
    {
        if ($level <= 5) return 'Apprentice';
        if ($level <= 10) return 'Creator';
        if ($level <= 15) return 'Craftsman';
        if ($level <= 20) return 'Artist';
        if ($level <= 25) return 'Specialist';
        if ($level <= 30) return 'Expert';
        if ($level <= 40) return 'Master';
        if ($level <= 50) return 'Virtuoso';
        return 'Legend';
    }

    /**
     * Get user's XP progress
     */
    public static function getUserProgress(int $userId): array
    {
        $user = Database::fetch(
            "SELECT xp_total, current_level, current_streak_days FROM users WHERE id = ?",
            [$userId]
        );

        if (!$user) {
            return [];
        }

        $level = $user['current_level'];
        $totalXPForCurrentLevel = self::getTotalXPForLevel($level);
        $xpForNextLevel = self::getXPForNextLevel($level);
        $xpInCurrentLevel = $user['xp_total'] - $totalXPForCurrentLevel;

        return [
            'total_xp' => (int) $user['xp_total'],
            'level' => (int) $level,
            'level_title' => self::getLevelTitle($level),
            'xp_in_level' => $xpInCurrentLevel,
            'xp_for_next_level' => $xpForNextLevel,
            'progress_percent' => round(($xpInCurrentLevel / $xpForNextLevel) * 100, 1),
            'streak_days' => (int) $user['current_streak_days']
        ];
    }

    /**
     * Get XP transactions for user
     */
    public static function getTransactions(int $userId, int $limit = 20, int $offset = 0): array
    {
        return Database::fetchAll(
            "SELECT * FROM xp_transactions WHERE user_id = ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [$userId, $limit, $offset]
        );
    }

    private static function recordTransaction(
        int $userId,
        int $amount,
        string $reason,
        string $referenceType,
        int $referenceId
    ): void {
        Database::insert('xp_transactions', [
            'user_id' => $userId,
            'amount' => $amount,
            'reason' => $reason,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId
        ]);
    }

    private static function updateUserXP(int $userId): void
    {
        // Get total XP
        $result = Database::fetch(
            "SELECT SUM(amount) as total FROM xp_transactions WHERE user_id = ?",
            [$userId]
        );

        $totalXP = (int) ($result['total'] ?? 0);
        $newLevel = self::calculateLevel($totalXP);

        // Get current level to check for level up
        $user = Database::fetch("SELECT current_level FROM users WHERE id = ?", [$userId]);
        $oldLevel = (int) ($user['current_level'] ?? 1);

        // Update user
        Database::update('users', [
            'xp_total' => $totalXP,
            'current_level' => $newLevel
        ], 'id = ?', [$userId]);

        // Send notification if leveled up
        if ($newLevel > $oldLevel) {
            NotificationService::create(
                $userId,
                'level_up',
                'Level Up!',
                "Congratulations! You reached Level {$newLevel} (" . self::getLevelTitle($newLevel) . ")",
                'user',
                $userId
            );
        }
    }

    private static function updateStreak(int $userId): void
    {
        $user = Database::fetch(
            "SELECT current_streak_days, last_task_completed_date FROM users WHERE id = ?",
            [$userId]
        );

        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $lastDate = $user['last_task_completed_date'];

        $newStreak = 1;

        if ($lastDate === $today) {
            // Already completed task today, no change to streak
            $newStreak = (int) $user['current_streak_days'];
        } elseif ($lastDate === $yesterday) {
            // Continuing streak
            $newStreak = (int) $user['current_streak_days'] + 1;

            // Check for streak bonuses
            if (in_array($newStreak, [3, 7, 30])) {
                self::awardStreakBonus($userId, $newStreak);
            }
        }
        // else: streak broken, starts at 1

        Database::update('users', [
            'current_streak_days' => $newStreak,
            'last_task_completed_date' => $today
        ], 'id = ?', [$userId]);
    }

    private static function isFirstTaskOfDay(int $userId): bool
    {
        $today = date('Y-m-d');

        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM tasks
             WHERE owner_id = ? AND DATE(completed_at) = ? AND status = 'complete'",
            [$userId, $today]
        );

        return (int) ($result['count'] ?? 0) === 0;
    }

    private static function getTotalXPForLevel(int $level): int
    {
        $total = 0;
        for ($i = 1; $i <= $level; $i++) {
            $total += 100 + ($i * 20) + (int)(pow($i, 1.5) * 10);
        }
        return $total;
    }
}
