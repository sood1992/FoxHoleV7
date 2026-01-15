<?php
/**
 * FOXHOLE Enterprise OS - API Entry Point
 *
 * This file should be placed in: public_html/api/index.php
 * Along with config/, src/, and .env in the same directory
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Load environment variables
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            putenv($line);
            [$key, $value] = explode('=', $line, 2);
            $_ENV[$key] = $value;
        }
    }
}

// Autoloader
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

use App\Middleware\CorsMiddleware;
use App\Utils\Response;

// Handle CORS
CorsMiddleware::handle();

// Parse request
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove /api prefix if present (for same-directory hosting)
if (strpos($path, '/api/v1') === 0) {
    $path = substr($path, 7); // Remove /api/v1
} elseif (strpos($path, '/api') === 0) {
    $path = substr($path, 4); // Remove /api
}

// Remove /v1 prefix if still present
if (strpos($path, '/v1') === 0) {
    $path = substr($path, 3);
}

// Ensure path starts with /
if (empty($path) || $path[0] !== '/') {
    $path = '/' . $path;
}

// Remove trailing slash except for root
if ($path !== '/' && substr($path, -1) === '/') {
    $path = rtrim($path, '/');
}

// Route definitions
$routes = [
    // Authentication
    'POST /auth/login' => ['App\Controllers\AuthController', 'login'],
    'POST /auth/logout' => ['App\Controllers\AuthController', 'logout'],
    'POST /auth/refresh' => ['App\Controllers\AuthController', 'refresh'],
    'GET /auth/me' => ['App\Controllers\AuthController', 'me'],
    'PUT /auth/password' => ['App\Controllers\AuthController', 'changePassword'],

    // Current User (Me) endpoints
    'GET /me/profile' => ['App\Controllers\UserController', 'myProfile'],
    'PUT /me/profile' => ['App\Controllers\UserController', 'updateMyProfile'],
    'PUT /me/password' => ['App\Controllers\UserController', 'changeMyPassword'],
    'GET /me/preferences' => ['App\Controllers\UserController', 'getPreferences'],
    'PUT /me/preferences' => ['App\Controllers\UserController', 'updatePreferences'],
    'GET /me/stats' => ['App\Controllers\UserController', 'myStats'],
    'GET /me/xp' => ['App\Controllers\UserController', 'myXP'],
    'GET /me/badges' => ['App\Controllers\UserController', 'myBadges'],

    // Users
    'GET /users' => ['App\Controllers\UserController', 'index'],
    'GET /users/:id' => ['App\Controllers\UserController', 'show'],
    'POST /users' => ['App\Controllers\UserController', 'store'],
    'PUT /users/:id' => ['App\Controllers\UserController', 'update'],
    'DELETE /users/:id' => ['App\Controllers\UserController', 'destroy'],
    'GET /users/:id/profile' => ['App\Controllers\UserController', 'profile'],
    'PUT /users/:id/profile' => ['App\Controllers\UserController', 'updateProfile'],
    'GET /users/:id/xp' => ['App\Controllers\UserController', 'xp'],
    'GET /users/:id/badges' => ['App\Controllers\UserController', 'badges'],
    'GET /leaderboard' => ['App\Controllers\UserController', 'leaderboard'],
    'GET /badges' => ['App\Controllers\UserController', 'allBadges'],

    // Projects
    'GET /projects' => ['App\Controllers\ProjectController', 'index'],
    'GET /projects/:id' => ['App\Controllers\ProjectController', 'show'],
    'POST /projects' => ['App\Controllers\ProjectController', 'store'],
    'PUT /projects/:id' => ['App\Controllers\ProjectController', 'update'],
    'DELETE /projects/:id' => ['App\Controllers\ProjectController', 'destroy'],
    'GET /projects/:id/members' => ['App\Controllers\ProjectController', 'members'],
    'POST /projects/:id/members' => ['App\Controllers\ProjectController', 'addMember'],
    'DELETE /projects/:id/members/:userId' => ['App\Controllers\ProjectController', 'removeMember'],
    'GET /projects/:id/columns' => ['App\Controllers\ProjectController', 'columns'],
    'POST /projects/:id/columns' => ['App\Controllers\ProjectController', 'createColumn'],
    'GET /projects/:id/kanban' => ['App\Controllers\KanbanController', 'getBoard'],
    'GET /projects/:id/tasks' => ['App\Controllers\TaskController', 'index'],

    // Kanban Columns
    'PUT /columns/:id' => ['App\Controllers\KanbanController', 'updateColumn'],
    'DELETE /columns/:id' => ['App\Controllers\KanbanController', 'deleteColumn'],
    'PUT /columns/reorder' => ['App\Controllers\KanbanController', 'reorderColumns'],

    // Tasks
    'GET /tasks/:id' => ['App\Controllers\TaskController', 'show'],
    'POST /tasks' => ['App\Controllers\TaskController', 'store'],
    'PUT /tasks/:id' => ['App\Controllers\TaskController', 'update'],
    'DELETE /tasks/:id' => ['App\Controllers\TaskController', 'destroy'],
    'PUT /tasks/:id/move' => ['App\Controllers\TaskController', 'move'],
    'PUT /tasks/:id/status' => ['App\Controllers\TaskController', 'updateStatus'],
    'GET /my-tasks' => ['App\Controllers\TaskController', 'myTasks'],

    // Task Dependencies
    'GET /tasks/:id/dependencies' => ['App\Controllers\TaskController', 'dependencies'],
    'POST /tasks/:id/dependencies' => ['App\Controllers\TaskController', 'addDependency'],
    'DELETE /dependencies/:id' => ['App\Controllers\TaskController', 'removeDependency'],

    // Task Contributors
    'GET /tasks/:id/contributors' => ['App\Controllers\TaskController', 'contributors'],
    'POST /tasks/:id/contributors' => ['App\Controllers\TaskController', 'addContributor'],

    // Comments
    'GET /tasks/:taskId/comments' => ['App\Controllers\CommentController', 'index'],
    'POST /tasks/:taskId/comments' => ['App\Controllers\CommentController', 'store'],
    'PUT /comments/:id' => ['App\Controllers\CommentController', 'update'],
    'DELETE /comments/:id' => ['App\Controllers\CommentController', 'destroy'],

    // Time Tracking
    'GET /time-entries' => ['App\Controllers\TimeController', 'index'],
    'POST /time-entries' => ['App\Controllers\TimeController', 'store'],
    'PUT /time-entries/:id' => ['App\Controllers\TimeController', 'update'],
    'DELETE /time-entries/:id' => ['App\Controllers\TimeController', 'destroy'],
    'POST /time-entries/:id/approve' => ['App\Controllers\TimeController', 'approve'],
    'GET /timer' => ['App\Controllers\TimeController', 'getTimer'],
    'POST /timer/start' => ['App\Controllers\TimeController', 'startTimer'],
    'POST /timer/stop' => ['App\Controllers\TimeController', 'stopTimer'],
    'GET /timesheet' => ['App\Controllers\TimeController', 'timesheet'],

    // Client Review Portal
    'POST /tasks/:taskId/review-portal' => ['App\Controllers\ReviewController', 'createPortal'],
    'GET /review/:token' => ['App\Controllers\ReviewController', 'getPortal'],
    'POST /review/:token/comment' => ['App\Controllers\ReviewController', 'addComment'],
    'PUT /review/:token/approve' => ['App\Controllers\ReviewController', 'approve'],
    'GET /review-portals/:id' => ['App\Controllers\ReviewController', 'show'],
    'POST /review-portals/:id/version' => ['App\Controllers\ReviewController', 'uploadVersion'],

    // Shoots (Production Calendar)
    'GET /shoots' => ['App\Controllers\ShootController', 'index'],
    'GET /shoots/:id' => ['App\Controllers\ShootController', 'show'],
    'POST /shoots' => ['App\Controllers\ShootController', 'store'],
    'PUT /shoots/:id' => ['App\Controllers\ShootController', 'update'],
    'DELETE /shoots/:id' => ['App\Controllers\ShootController', 'destroy'],
    'POST /shoots/:id/crew' => ['App\Controllers\ShootController', 'addCrew'],
    'PUT /shoots/:id/crew/:crewId/status' => ['App\Controllers\ShootController', 'updateCrewStatus'],
    'POST /shoots/:id/notify' => ['App\Controllers\ShootController', 'notify'],
    'POST /shoots/:id/equipment' => ['App\Controllers\ShootController', 'addEquipment'],
    'DELETE /shoots/:id/equipment/:equipmentId' => ['App\Controllers\ShootController', 'removeEquipment'],

    // Dashboards & Analytics
    'GET /dashboard/admin' => ['App\Controllers\AnalyticsController', 'adminDashboard'],
    'GET /dashboard/pm' => ['App\Controllers\AnalyticsController', 'pmDashboard'],
    'GET /dashboard/employee' => ['App\Controllers\AnalyticsController', 'employeeDashboard'],
    'GET /analytics/dashboard' => ['App\Controllers\AnalyticsController', 'dashboard'],
    'GET /analytics/utilization' => ['App\Controllers\AnalyticsController', 'utilization'],
    'GET /analytics/roi' => ['App\Controllers\AnalyticsController', 'roi'],
    'GET /analytics/projects-roi' => ['App\Controllers\AnalyticsController', 'projectsROI'],
    'GET /analytics/capacity' => ['App\Controllers\AnalyticsController', 'capacity'],
    'GET /analytics/team-performance' => ['App\Controllers\AnalyticsController', 'teamPerformance'],

    // Notifications
    'GET /notifications' => ['App\Controllers\NotificationController', 'index'],
    'PUT /notifications/:id/read' => ['App\Controllers\NotificationController', 'markRead'],
    'PUT /notifications/read-all' => ['App\Controllers\NotificationController', 'markAllRead'],
];

// Route matching function
function matchRoute(string $method, string $path, array $routes): ?array
{
    $routeKey = "{$method} {$path}";

    // Try exact match first
    if (isset($routes[$routeKey])) {
        return ['handler' => $routes[$routeKey], 'params' => []];
    }

    // Try pattern matching
    foreach ($routes as $pattern => $handler) {
        [$routeMethod, $routePath] = explode(' ', $pattern, 2);

        if ($routeMethod !== $method) {
            continue;
        }

        // Convert route pattern to regex
        $regex = preg_replace('/:([a-zA-Z]+)/', '(?P<$1>[^/]+)', $routePath);
        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $path, $matches)) {
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            return ['handler' => $handler, 'params' => $params];
        }
    }

    return null;
}

// Match and execute route
try {
    $match = matchRoute($requestMethod, $path, $routes);

    if ($match) {
        [$controller, $method] = $match['handler'];
        $params = array_values($match['params']);

        // Call controller method with params
        call_user_func_array([$controller, $method], $params);
    } else {
        Response::notFound('Endpoint not found');
    }
} catch (\PDOException $e) {
    error_log('Database Error: ' . $e->getMessage());
    Response::serverError('Database error occurred');
} catch (\Exception $e) {
    error_log('Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    if (getenv('APP_DEBUG') === 'true') {
        Response::error($e->getMessage(), 500);
    } else {
        Response::serverError('An error occurred');
    }
}
