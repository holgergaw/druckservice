<?php

declare(strict_types=1);

class CatalogItem
{
    public static function listActive(): array
    {
        return Database::fetchAll(
            "SELECT c.id, c.title, c.description, c.image_path, c.external_url,
                    m.name AS material_name
             FROM catalog_items c
             LEFT JOIN materials m ON c.default_material_id = m.id
             WHERE c.is_active = 1
             ORDER BY c.sort_order, c.title"
        );
    }

    public static function listAll(): array
    {
        return Database::fetchAll(
            "SELECT c.*, m.name AS material_name
             FROM catalog_items c
             LEFT JOIN materials m ON c.default_material_id = m.id
             ORDER BY c.sort_order, c.title"
        );
    }

    public static function findById(int $id): ?array
    {
        return Database::fetchOne(
            "SELECT c.*, m.name AS material_name
             FROM catalog_items c
             LEFT JOIN materials m ON c.default_material_id = m.id
             WHERE c.id = ?",
            [$id]
        );
    }

    public static function create(array $data): int
    {
        $allowed = ['title', 'description', 'image_path', 'model_path', 'external_url',
                     'default_material_id', 'estimated_weight_g', 'estimated_time_min',
                     'is_active', 'sort_order'];
        $filtered = array_intersect_key($data, array_flip($allowed));
        return Database::insert('catalog_items', $filtered);
    }

    public static function update(int $id, array $data): void
    {
        $allowed = ['title', 'description', 'image_path', 'model_path', 'external_url',
                     'default_material_id', 'estimated_weight_g', 'estimated_time_min',
                     'is_active', 'sort_order'];
        $filtered = array_intersect_key($data, array_flip($allowed));
        if (!empty($filtered)) {
            Database::update('catalog_items', $filtered, 'id = ?', [$id]);
        }
    }
}
