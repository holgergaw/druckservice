<?php

declare(strict_types=1);

class Auth
{
    public static function login(string $password): bool
    {
        $hash = env('ADMIN_PASSWORD_HASH');
        if ($hash === '') {
            return false;
        }

        if (password_verify($password, $hash)) {
            $_SESSION['admin'] = true;
            $_SESSION['login_time'] = time();
            self::regenerateCsrf();
            return true;
        }

        return false;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    public static function isLoggedIn(): bool
    {
        if (empty($_SESSION['admin'])) {
            return false;
        }

        // Session expires after 8 hours
        $loginTime = $_SESSION['login_time'] ?? 0;
        if (time() - $loginTime > 8 * 3600) {
            self::logout();
            return false;
        }

        return true;
    }

    public static function getCsrfToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            self::regenerateCsrf();
        }
        return $_SESSION['csrf_token'];
    }

    public static function validateCsrf(string $token): bool
    {
        if (empty($_SESSION['csrf_token']) || $token === '') {
            return false;
        }
        return hash_equals($_SESSION['csrf_token'], $token);
    }

    private static function regenerateCsrf(): void
    {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}
