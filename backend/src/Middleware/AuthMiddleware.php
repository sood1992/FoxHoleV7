<?php
namespace App\Middleware;

use App\Utils\JWT;
use App\Utils\Response;
use App\Utils\Database;

class AuthMiddleware
{
    private static ?array $currentUser = null;

    public static function authenticate(): array
    {
        $token = self::getBearerToken();

        if (!$token) {
            Response::unauthorized('No token provided');
        }

        $payload = JWT::decode($token);

        if (!$payload || !isset($payload['user_id'])) {
            Response::unauthorized('Invalid or expired token');
        }

        $user = Database::fetch(
            "SELECT id, email, name, avatar_url, phone, role, designation,
                    hourly_cost, weekly_capacity_hours, is_active, xp_total,
                    current_level, current_streak_days, show_level_publicly,
                    appear_on_leaderboard, show_badges, created_at
             FROM users WHERE id = ? AND is_active = 1",
            [$payload['user_id']]
        );

        if (!$user) {
            Response::unauthorized('User not found or inactive');
        }

        self::$currentUser = $user;
        return $user;
    }

    public static function getCurrentUser(): ?array
    {
        return self::$currentUser;
    }

    public static function requireRole(string ...$roles): void
    {
        $user = self::getCurrentUser();

        if (!$user) {
            Response::unauthorized('Authentication required');
        }

        if (!in_array($user['role'], $roles)) {
            Response::forbidden('Insufficient permissions');
        }
    }

    public static function isAdmin(): bool
    {
        return self::$currentUser && self::$currentUser['role'] === 'admin';
    }

    public static function isPM(): bool
    {
        return self::$currentUser && in_array(self::$currentUser['role'], ['admin', 'pm']);
    }

    public static function isEmployee(): bool
    {
        return self::$currentUser && self::$currentUser['role'] === 'employee';
    }

    public static function canManageProject(int $projectId): bool
    {
        if (self::isAdmin()) {
            return true;
        }

        $member = Database::fetch(
            "SELECT role FROM project_members
             WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
            [$projectId, self::$currentUser['id']]
        );

        return $member !== null;
    }

    public static function canAccessProject(int $projectId): bool
    {
        if (self::isAdmin()) {
            return true;
        }

        $member = Database::fetch(
            "SELECT id FROM project_members WHERE project_id = ? AND user_id = ?",
            [$projectId, self::$currentUser['id']]
        );

        return $member !== null;
    }

    public static function canManageTask(int $taskId): bool
    {
        if (self::isAdmin()) {
            return true;
        }

        $task = Database::fetch("SELECT project_id, owner_id, created_by FROM tasks WHERE id = ?", [$taskId]);

        if (!$task) {
            return false;
        }

        // Owner or creator can manage
        if ($task['owner_id'] == self::$currentUser['id'] || $task['created_by'] == self::$currentUser['id']) {
            return true;
        }

        // Project manager can manage
        return self::canManageProject($task['project_id']);
    }

    private static function getBearerToken(): ?string
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
