<?php

declare(strict_types=1);

require_once __DIR__ . '/../Models/Setting.php';

class SettingsController
{
    public static function getAll(): void
    {
        Router::json(Setting::getAll());
    }

    public static function updateAll(): void
    {
        $body = Router::getBody();

        if (empty($body)) {
            Router::json(['error' => 'Keine Einstellungen übergeben'], 400);
            return;
        }

        // Only allow known settings keys
        $allowed = ['electricity_kwh_rate', 'printer_wattage', 'admin_email'];
        $filtered = array_intersect_key($body, array_flip($allowed));

        Setting::updateAll($filtered);
        Router::json(['success' => true]);
    }
}
