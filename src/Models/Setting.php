<?php

declare(strict_types=1);

class Setting
{
    public static function get(string $key, string $default = ''): string
    {
        $row = Database::fetchOne("SELECT `value` FROM settings WHERE `key` = ?", [$key]);
        return $row ? $row['value'] : $default;
    }

    public static function set(string $key, string $value): void
    {
        $pdo = Database::getInstance();
        $stmt = $pdo->prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
        $stmt->execute([$key, $value]);
    }

    public static function getAll(): array
    {
        $rows = Database::fetchAll("SELECT `key`, `value` FROM settings ORDER BY `key`");
        $result = [];
        foreach ($rows as $row) {
            $result[$row['key']] = $row['value'];
        }
        return $result;
    }

    public static function updateAll(array $settings): void
    {
        foreach ($settings as $key => $value) {
            self::set((string) $key, (string) $value);
        }
    }
}
