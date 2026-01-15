<?php
namespace App\Middleware;

class CorsMiddleware
{
    public static function handle(): void
    {
        $config = require __DIR__ . '/../../config/app.php';
        $cors = $config['cors'];

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Check if origin is allowed
        if (in_array($origin, $cors['allowed_origins']) || in_array('*', $cors['allowed_origins'])) {
            header("Access-Control-Allow-Origin: {$origin}");
        }

        header("Access-Control-Allow-Methods: " . implode(', ', $cors['allowed_methods']));
        header("Access-Control-Allow-Headers: " . implode(', ', $cors['allowed_headers']));
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: {$cors['max_age']}");

        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
