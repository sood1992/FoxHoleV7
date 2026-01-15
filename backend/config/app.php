<?php
/**
 * Application Configuration
 */

return [
    'name' => 'Foxhole',
    'version' => '1.0.0',
    'env' => getenv('APP_ENV') ?: 'development',
    'debug' => getenv('APP_DEBUG') === 'true',
    'url' => getenv('APP_URL') ?: 'http://localhost/foxhole',

    'jwt' => [
        'secret' => getenv('JWT_SECRET') ?: 'foxhole-super-secret-key-change-in-production',
        'expiry' => (int)(getenv('JWT_EXPIRY') ?: 900), // 15 minutes
        'refresh_expiry' => (int)(getenv('REFRESH_TOKEN_EXPIRY') ?: 604800), // 7 days
        'algorithm' => 'HS256',
    ],

    'upload' => [
        'max_size' => (int)(getenv('UPLOAD_MAX_SIZE') ?: 52428800), // 50MB
        'allowed_types' => [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime', 'video/x-msvideo',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        'path' => __DIR__ . '/../../uploads',
    ],

    'twilio' => [
        'sid' => getenv('TWILIO_SID') ?: '',
        'auth_token' => getenv('TWILIO_AUTH_TOKEN') ?: '',
        'whatsapp_number' => getenv('TWILIO_WHATSAPP_NUMBER') ?: '',
    ],

    'xp' => [
        'task_complete_trivial' => 5,
        'task_complete_simple' => 15,
        'task_complete_medium' => 30,
        'task_complete_complex' => 50,
        'task_complete_epic' => 100,
        'on_time_multiplier' => 1.25,
        'first_task_of_day' => 15,
        'streak_day_3' => 25,
        'streak_day_7' => 75,
        'streak_day_30' => 300,
        'first_time_approval' => 40,
        'zero_revision_delivery' => 50,
        'helped_teammate' => 20,
        'late_multiplier' => 0.5,
    ],

    'cors' => [
        'allowed_origins' => ['http://localhost:5173', 'http://localhost:3000'],
        'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
        'max_age' => 86400,
    ],
];
