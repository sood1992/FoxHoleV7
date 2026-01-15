<?php
namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;
use App\Services\XPService;
use App\Services\BadgeService;

class UserController
{
    /**
     * GET /users
     */
    public static function index(): void
    {
        $user = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin');

        $users = Database::fetchAll(
            "SELECT id, email, name, avatar_url, phone, role, designation,
                    hourly_cost, weekly_capacity_hours, is_active, xp_total,
                    current_level, current_streak_days, created_at
             FROM users ORDER BY name ASC"
        );

        Response::success($users);
    }

    /**
     * GET /users/:id
     */
    public static function show(int $id): void
    {
        $currentUser = AuthMiddleware::authenticate();

        // Non-admins can only view their own profile
        if (!AuthMiddleware::isAdmin() && $currentUser['id'] !== $id) {
            Response::forbidden('You can only view your own profile');
        }

        $user = Database::fetch(
            "SELECT id, email, name, avatar_url, phone, role, designation,
                    hourly_cost, weekly_capacity_hours, is_active, xp_total,
                    current_level, current_streak_days, show_level_publicly,
                    appear_on_leaderboard, show_badges, created_at
             FROM users WHERE id = ?",
            [$id]
        );

        if (!$user) {
            Response::notFound('User not found');
        }

        // Add XP progress
        $user['xp_progress'] = XPService::getUserProgress($id);

        // Add badges
        $user['badges'] = BadgeService::getUserBadges($id);

        // Add stats
        $stats = Database::fetch(
            "SELECT
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND status = 'complete') as tasks_completed,
                (SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND status NOT IN ('complete', 'blocked')) as tasks_active,
                (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE user_id = ?) as total_hours
            ",
            [$id, $id, $id]
        );

        $user['stats'] = [
            'tasks_completed' => (int) $stats['tasks_completed'],
            'tasks_active' => (int) $stats['tasks_active'],
            'total_hours' => (float) $stats['total_hours']
        ];

        Response::success($user);
    }

    /**
     * POST /users
     */
    public static function store(): void
    {
        AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin');

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data)
            ->required('email')
            ->email('email')
            ->unique('email', 'users', 'email')
            ->required('name')
            ->minLength('name', 2)
            ->required('password')
            ->minLength('password', 8)
            ->required('role')
            ->in('role', ['admin', 'pm', 'employee']);

        $validator->validate();

        $id = Database::insert('users', [
            'email' => $data['email'],
            'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'],
            'designation' => $data['designation'] ?? null,
            'hourly_cost' => $data['hourly_cost'] ?? 0,
            'weekly_capacity_hours' => $data['weekly_capacity_hours'] ?? 40
        ]);

        $user = Database::fetch(
            "SELECT id, email, name, phone, role, designation, hourly_cost,
                    weekly_capacity_hours, is_active, created_at
             FROM users WHERE id = ?",
            [$id]
        );

        Response::created($user, 'User created successfully');
    }

    /**
     * PUT /users/:id
     */
    public static function update(int $id): void
    {
        AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin');

        $user = Database::fetch("SELECT id FROM users WHERE id = ?", [$id]);
        if (!$user) {
            Response::notFound('User not found');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data);

        if (isset($data['email'])) {
            $validator->email('email')->unique('email', 'users', 'email', $id);
        }
        if (isset($data['name'])) {
            $validator->minLength('name', 2);
        }
        if (isset($data['role'])) {
            $validator->in('role', ['admin', 'pm', 'employee']);
        }

        $validator->validate();

        $updateData = [];
        $allowedFields = ['email', 'name', 'phone', 'role', 'designation', 'hourly_cost', 'weekly_capacity_hours', 'is_active'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (isset($data['password']) && !empty($data['password'])) {
            $updateData['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (!empty($updateData)) {
            Database::update('users', $updateData, 'id = ?', [$id]);
        }

        $updatedUser = Database::fetch(
            "SELECT id, email, name, phone, role, designation, hourly_cost,
                    weekly_capacity_hours, is_active, created_at
             FROM users WHERE id = ?",
            [$id]
        );

        Response::success($updatedUser, 'User updated successfully');
    }

    /**
     * DELETE /users/:id
     */
    public static function destroy(int $id): void
    {
        $currentUser = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole('admin');

        if ($currentUser['id'] === $id) {
            Response::error('You cannot deactivate yourself', 400);
        }

        $user = Database::fetch("SELECT id FROM users WHERE id = ?", [$id]);
        if (!$user) {
            Response::notFound('User not found');
        }

        // Soft delete - deactivate
        Database::update('users', ['is_active' => 0], 'id = ?', [$id]);

        Response::success(null, 'User deactivated successfully');
    }

    /**
     * GET /users/:id/profile
     */
    public static function profile(int $id): void
    {
        self::show($id);
    }

    /**
     * PUT /users/:id/profile
     */
    public static function updateProfile(int $id): void
    {
        $currentUser = AuthMiddleware::authenticate();

        if ($currentUser['id'] !== $id && !AuthMiddleware::isAdmin()) {
            Response::forbidden('You can only update your own profile');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $updateData = [];
        $allowedFields = ['name', 'phone', 'avatar_url', 'show_level_publicly', 'appear_on_leaderboard', 'show_badges'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            Database::update('users', $updateData, 'id = ?', [$id]);
        }

        $updatedUser = Database::fetch(
            "SELECT id, email, name, avatar_url, phone, role, designation,
                    show_level_publicly, appear_on_leaderboard, show_badges, created_at
             FROM users WHERE id = ?",
            [$id]
        );

        Response::success($updatedUser, 'Profile updated successfully');
    }

    /**
     * GET /users/:id/xp
     */
    public static function xp(int $id): void
    {
        $currentUser = AuthMiddleware::authenticate();

        // Anyone can view XP if user allows it
        $user = Database::fetch(
            "SELECT show_level_publicly FROM users WHERE id = ?",
            [$id]
        );

        if (!$user) {
            Response::notFound('User not found');
        }

        if (!$user['show_level_publicly'] && $currentUser['id'] !== $id && !AuthMiddleware::isAdmin()) {
            Response::forbidden('This user has hidden their XP');
        }

        $progress = XPService::getUserProgress($id);
        $transactions = XPService::getTransactions($id, 20);

        Response::success([
            'progress' => $progress,
            'recent_transactions' => $transactions
        ]);
    }

    /**
     * GET /users/:id/badges
     */
    public static function badges(int $id): void
    {
        $currentUser = AuthMiddleware::authenticate();

        $user = Database::fetch(
            "SELECT show_badges FROM users WHERE id = ?",
            [$id]
        );

        if (!$user) {
            Response::notFound('User not found');
        }

        if (!$user['show_badges'] && $currentUser['id'] !== $id && !AuthMiddleware::isAdmin()) {
            Response::forbidden('This user has hidden their badges');
        }

        if ($currentUser['id'] === $id) {
            // Show progress for own badges
            $badges = BadgeService::getAllBadgesWithProgress($id);
        } else {
            // Only show earned badges for others
            $badges = BadgeService::getUserBadges($id);
        }

        Response::success($badges);
    }

    /**
     * GET /leaderboard
     */
    public static function leaderboard(): void
    {
        AuthMiddleware::authenticate();

        $users = Database::fetchAll(
            "SELECT id, name, avatar_url, role, designation, xp_total, current_level,
                    current_streak_days
             FROM users
             WHERE is_active = 1 AND appear_on_leaderboard = 1
             ORDER BY xp_total DESC
             LIMIT 20"
        );

        foreach ($users as &$user) {
            $user['level_title'] = XPService::getLevelTitle($user['current_level']);
        }

        Response::success($users);
    }

    /**
     * GET /badges (all available badges)
     */
    public static function allBadges(): void
    {
        AuthMiddleware::authenticate();

        $badges = Database::fetchAll(
            "SELECT id, name, icon, description, category, criteria_type, criteria_value
             FROM badges ORDER BY category, name"
        );

        Response::success($badges);
    }

    /**
     * GET /me/profile
     */
    public static function myProfile(): void
    {
        $currentUser = AuthMiddleware::authenticate();
        self::show($currentUser['id']);
    }

    /**
     * PUT /me/profile
     */
    public static function updateMyProfile(): void
    {
        $currentUser = AuthMiddleware::authenticate();

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $updateData = [];
        $allowedFields = ['name', 'phone', 'avatar_url', 'designation', 'department', 'show_level_publicly', 'appear_on_leaderboard', 'show_badges'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData)) {
            Database::update('users', $updateData, 'id = ?', [$currentUser['id']]);
        }

        $updatedUser = Database::fetch(
            "SELECT id, email, name, avatar_url, phone, role, designation, department,
                    xp_total, current_level, show_level_publicly, appear_on_leaderboard,
                    show_badges, created_at
             FROM users WHERE id = ?",
            [$currentUser['id']]
        );

        Response::success($updatedUser, 'Profile updated successfully');
    }

    /**
     * PUT /me/password
     */
    public static function changeMyPassword(): void
    {
        $currentUser = AuthMiddleware::authenticate();

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['current_password']) || empty($data['new_password'])) {
            Response::error('Current and new passwords are required', 400);
        }

        $user = Database::fetch(
            "SELECT password_hash FROM users WHERE id = ?",
            [$currentUser['id']]
        );

        if (!password_verify($data['current_password'], $user['password_hash'])) {
            Response::error('Current password is incorrect', 400);
        }

        if (strlen($data['new_password']) < 8) {
            Response::error('New password must be at least 8 characters', 400);
        }

        Database::update('users', [
            'password_hash' => password_hash($data['new_password'], PASSWORD_DEFAULT)
        ], 'id = ?', [$currentUser['id']]);

        Response::success(null, 'Password changed successfully');
    }

    /**
     * GET /me/preferences
     */
    public static function getPreferences(): void
    {
        $currentUser = AuthMiddleware::authenticate();

        $prefs = Database::fetch(
            "SELECT email_notifications, push_notifications, weekly_digest, dark_mode
             FROM user_preferences WHERE user_id = ?",
            [$currentUser['id']]
        );

        // Return defaults if not found
        if (!$prefs) {
            $prefs = [
                'email_notifications' => true,
                'push_notifications' => true,
                'weekly_digest' => true,
                'dark_mode' => false
            ];
        } else {
            // Convert to boolean
            $prefs['email_notifications'] = (bool)$prefs['email_notifications'];
            $prefs['push_notifications'] = (bool)$prefs['push_notifications'];
            $prefs['weekly_digest'] = (bool)$prefs['weekly_digest'];
            $prefs['dark_mode'] = (bool)$prefs['dark_mode'];
        }

        Response::success($prefs);
    }

    /**
     * PUT /me/preferences
     */
    public static function updatePreferences(): void
    {
        $currentUser = AuthMiddleware::authenticate();

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $prefs = [
            'email_notifications' => $data['email_notifications'] ?? true,
            'push_notifications' => $data['push_notifications'] ?? true,
            'weekly_digest' => $data['weekly_digest'] ?? true,
            'dark_mode' => $data['dark_mode'] ?? false
        ];

        // Check if preferences exist
        $existing = Database::fetch(
            "SELECT id FROM user_preferences WHERE user_id = ?",
            [$currentUser['id']]
        );

        if ($existing) {
            Database::update('user_preferences', $prefs, 'user_id = ?', [$currentUser['id']]);
        } else {
            $prefs['user_id'] = $currentUser['id'];
            Database::insert('user_preferences', $prefs);
        }

        Response::success($prefs, 'Preferences updated successfully');
    }

    /**
     * GET /me/stats
     */
    public static function myStats(): void
    {
        $currentUser = AuthMiddleware::authenticate();
        $userId = $currentUser['id'];

        $user = Database::fetch(
            "SELECT xp_total, current_level, current_streak_days
             FROM users WHERE id = ?",
            [$userId]
        );

        $taskStats = Database::fetch(
            "SELECT
                COUNT(CASE WHEN status = 'complete' THEN 1 END) as tasks_completed,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as tasks_in_progress,
                COUNT(*) as total_tasks
             FROM tasks WHERE owner_id = ?",
            [$userId]
        );

        $timeStats = Database::fetch(
            "SELECT COALESCE(SUM(hours), 0) as total_hours,
                    COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable_hours
             FROM time_entries WHERE user_id = ?",
            [$userId]
        );

        $badgeCount = Database::fetch(
            "SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?",
            [$userId]
        );

        Response::success([
            'total_xp' => (int)$user['xp_total'],
            'level' => (int)$user['current_level'],
            'current_streak' => (int)$user['current_streak_days'],
            'tasks_completed' => (int)$taskStats['tasks_completed'],
            'tasks_in_progress' => (int)$taskStats['tasks_in_progress'],
            'total_tasks' => (int)$taskStats['total_tasks'],
            'total_hours' => (float)$timeStats['total_hours'],
            'billable_hours' => (float)$timeStats['billable_hours'],
            'badges_earned' => (int)$badgeCount['count']
        ]);
    }

    /**
     * GET /me/xp
     */
    public static function myXP(): void
    {
        $currentUser = AuthMiddleware::authenticate();

        $transactions = Database::fetchAll(
            "SELECT id, amount, source, description, created_at
             FROM xp_transactions
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 20",
            [$currentUser['id']]
        );

        Response::success($transactions);
    }

    /**
     * GET /me/badges
     */
    public static function myBadges(): void
    {
        $currentUser = AuthMiddleware::authenticate();

        $badges = Database::fetchAll(
            "SELECT b.id, b.name, b.icon, b.description, b.category, ub.earned_at
             FROM badges b
             INNER JOIN user_badges ub ON b.id = ub.badge_id
             WHERE ub.user_id = ?
             ORDER BY ub.earned_at DESC",
            [$currentUser['id']]
        );

        Response::success($badges);
    }
}
