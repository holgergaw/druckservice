<?php

declare(strict_types=1);

require_once __DIR__ . '/../Auth.php';
require_once __DIR__ . '/../Models/Order.php';

class AdminController
{
    public static function login(): void
    {
        $body = Router::getBody();
        $password = $body['password'] ?? '';

        if ($password === '') {
            Router::json(['error' => 'Passwort erforderlich'], 400);
            return;
        }

        if (Auth::login($password)) {
            Router::json([
                'success' => true,
                'csrf_token' => Auth::getCsrfToken(),
            ]);
        } else {
            Router::json(['error' => 'Falsches Passwort'], 401);
        }
    }

    public static function logout(): void
    {
        Auth::logout();
        Router::json(['success' => true]);
    }

    public static function checkAuth(): void
    {
        if (Auth::isLoggedIn()) {
            Router::json([
                'authenticated' => true,
                'csrf_token' => Auth::getCsrfToken(),
            ]);
        } else {
            Router::json(['authenticated' => false], 401);
        }
    }

    public static function stats(): void
    {
        $counts = Order::getStatusCounts();

        $unpaidCount = Database::fetchOne(
            "SELECT COUNT(*) AS cnt FROM orders WHERE is_paid = 0 AND status IN ('accepted','printing','done','delivered')"
        );

        Router::json([
            'status_counts' => $counts,
            'total' => array_sum($counts),
            'unpaid' => (int) ($unpaidCount['cnt'] ?? 0),
        ]);
    }
}
