<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\JWT;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;

class AuthController
{
    /**
     * POST /auth/login
     */
    public static function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('email')
            ->email('email')
            ->required('password');

        $validator->validate();

        $user = Database::fetch(
            "SELECT * FROM users WHERE email = ? AND is_active = 1",
            [$data['email']]
        );

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }

        // Generate tokens
        $accessToken = JWT::encode([
            'user_id' => $user['id'],
            'role' => $user['role']
        ]);

        $refreshToken = JWT::generateRefreshToken();

        // Store refresh token
        $appConfig = require __DIR__ . '/../../config/app.php';
        $expiresAt = date('Y-m-d H:i:s', time() + $appConfig['jwt']['refresh_expiry']);

        Database::insert('refresh_tokens', [
            'user_id' => $user['id'],
            'token' => hash('sha256', $refreshToken),
            'expires_at' => $expiresAt
        ]);

        // Log activity
        Database::insert('activity_log', [
            'user_id' => $user['id'],
            'action' => 'login',
            'entity_type' => 'user',
            'entity_id' => $user['id'],
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
        ]);

        // Remove sensitive data
        unset($user['password_hash']);

        Response::success([
            'user' => $user,
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => $appConfig['jwt']['expiry']
        ], 'Login successful');
    }

    /**
     * POST /auth/logout
     */
    public static function logout(): void
    {
        $user = AuthMiddleware::authenticate();

        // Invalidate all refresh tokens for this user
        Database::delete('refresh_tokens', 'user_id = ?', [$user['id']]);

        // Log activity
        Database::insert('activity_log', [
            'user_id' => $user['id'],
            'action' => 'logout',
            'entity_type' => 'user',
            'entity_id' => $user['id'],
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
        ]);

        Response::success(null, 'Logged out successfully');
    }

    /**
     * POST /auth/refresh
     */
    public static function refresh(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['refresh_token'])) {
            Response::error('Refresh token required', 400);
        }

        $hashedToken = hash('sha256', $data['refresh_token']);

        $tokenRecord = Database::fetch(
            "SELECT rt.*, u.id as user_id, u.role, u.is_active
             FROM refresh_tokens rt
             INNER JOIN users u ON rt.user_id = u.id
             WHERE rt.token = ? AND rt.expires_at > NOW()",
            [$hashedToken]
        );

        if (!$tokenRecord || !$tokenRecord['is_active']) {
            Response::error('Invalid or expired refresh token', 401);
        }

        // Delete old token
        Database::delete('refresh_tokens', 'token = ?', [$hashedToken]);

        // Generate new tokens
        $accessToken = JWT::encode([
            'user_id' => $tokenRecord['user_id'],
            'role' => $tokenRecord['role']
        ]);

        $newRefreshToken = JWT::generateRefreshToken();

        $appConfig = require __DIR__ . '/../../config/app.php';
        $expiresAt = date('Y-m-d H:i:s', time() + $appConfig['jwt']['refresh_expiry']);

        Database::insert('refresh_tokens', [
            'user_id' => $tokenRecord['user_id'],
            'token' => hash('sha256', $newRefreshToken),
            'expires_at' => $expiresAt
        ]);

        Response::success([
            'access_token' => $accessToken,
            'refresh_token' => $newRefreshToken,
            'expires_in' => $appConfig['jwt']['expiry']
        ]);
    }

    /**
     * GET /auth/me
     */
    public static function me(): void
    {
        $user = AuthMiddleware::authenticate();

        // Get additional stats
        $stats = Database::fetch(
            "SELECT
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND status = 'complete') as tasks_completed,
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND status NOT IN ('complete', 'blocked')) as tasks_active,
                (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as hours_this_week
            ",
            [$user['id'], $user['id'], $user['id']]
        );

        $user['stats'] = [
            'tasks_completed' => (int) $stats['tasks_completed'],
            'tasks_active' => (int) $stats['tasks_active'],
            'hours_this_week' => (float) $stats['hours_this_week']
        ];

        // Get XP progress
        $user['xp_progress'] = \App\Services\XPService::getUserProgress($user['id']);

        Response::success($user);
    }

    /**
     * PUT /auth/password
     */
    public static function changePassword(): void
    {
        $user = AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('current_password')
            ->required('new_password')
            ->minLength('new_password', 8);

        $validator->validate();

        // Verify current password
        $userRecord = Database::fetch(
            "SELECT password_hash FROM users WHERE id = ?",
            [$user['id']]
        );

        if (!password_verify($data['current_password'], $userRecord['password_hash'])) {
            Response::error('Current password is incorrect', 400);
        }

        // Update password
        Database::update('users', [
            'password_hash' => password_hash($data['new_password'], PASSWORD_DEFAULT)
        ], 'id = ?', [$user['id']]);

        // Invalidate all refresh tokens
        Database::delete('refresh_tokens', 'user_id = ?', [$user['id']]);

        Response::success(null, 'Password changed successfully');
    }
}
