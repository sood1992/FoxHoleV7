<?php
namespace App\Utils;

class JWT
{
    private static ?array $config = null;

    private static function getConfig(): array
    {
        if (self::$config === null) {
            $appConfig = require __DIR__ . '/../../config/app.php';
            self::$config = $appConfig['jwt'];
        }
        return self::$config;
    }

    public static function encode(array $payload): string
    {
        $config = self::getConfig();

        $header = self::base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => $config['algorithm']
        ]));

        $payload['iat'] = time();
        $payload['exp'] = time() + $config['expiry'];

        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "{$header}.{$payloadEncoded}", $config['secret'], true)
        );

        return "{$header}.{$payloadEncoded}.{$signature}";
    }

    public static function decode(string $token): ?array
    {
        $config = self::getConfig();
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parts;

        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "{$header}.{$payload}", $config['secret'], true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payloadData = json_decode(self::base64UrlDecode($payload), true);

        if (!$payloadData || !isset($payloadData['exp'])) {
            return null;
        }

        if ($payloadData['exp'] < time()) {
            return null;
        }

        return $payloadData;
    }

    public static function generateRefreshToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
