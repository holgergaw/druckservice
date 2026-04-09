<?php

declare(strict_types=1);

class Color
{
    public static function listActive(): array
    {
        return Database::fetchAll("SELECT id, name, hex_code FROM colors WHERE is_active = 1 ORDER BY sort_order, name");
    }

    public static function listAll(): array
    {
        return Database::fetchAll("SELECT * FROM colors ORDER BY sort_order, name");
    }

    public static function findById(int $id): ?array
    {
        return Database::fetchOne("SELECT * FROM colors WHERE id = ?", [$id]);
    }

    public static function create(string $name, ?string $hexCode = null, int $sortOrder = 0): int
    {
        return Database::insert('colors', [
            'name' => $name,
            'hex_code' => $hexCode,
            'sort_order' => $sortOrder,
        ]);
    }

    public static function update(int $id, array $data): void
    {
        $allowed = ['name', 'hex_code', 'is_active', 'sort_order'];
        $filtered = array_intersect_key($data, array_flip($allowed));
        if (!empty($filtered)) {
            Database::update('colors', $filtered, 'id = ?', [$id]);
        }
    }
}
