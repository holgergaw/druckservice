<?php

declare(strict_types=1);

class Material
{
    public static function listActive(): array
    {
        return Database::fetchAll("SELECT id, name, price_per_kg FROM materials WHERE is_active = 1 ORDER BY sort_order, name");
    }

    public static function listAll(): array
    {
        return Database::fetchAll("SELECT * FROM materials ORDER BY sort_order, name");
    }

    public static function findById(int $id): ?array
    {
        return Database::fetchOne("SELECT * FROM materials WHERE id = ?", [$id]);
    }

    public static function create(string $name, float $pricePerKg, int $sortOrder = 0): int
    {
        return Database::insert('materials', [
            'name' => $name,
            'price_per_kg' => $pricePerKg,
            'sort_order' => $sortOrder,
        ]);
    }

    public static function update(int $id, array $data): void
    {
        $allowed = ['name', 'price_per_kg', 'is_active', 'sort_order'];
        $filtered = array_intersect_key($data, array_flip($allowed));
        if (!empty($filtered)) {
            Database::update('materials', $filtered, 'id = ?', [$id]);
        }
    }
}
