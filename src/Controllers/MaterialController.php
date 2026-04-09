<?php

declare(strict_types=1);

require_once __DIR__ . '/../Models/Material.php';

class MaterialController
{
    public static function listPublic(): void
    {
        Router::json(Material::listActive());
    }

    public static function adminList(): void
    {
        Router::json(Material::listAll());
    }

    public static function adminCreate(): void
    {
        $body = Router::getBody();
        $name = trim($body['name'] ?? '');
        $pricePerKg = (float) ($body['price_per_kg'] ?? 0);

        if ($name === '') {
            Router::json(['error' => 'Name erforderlich'], 400);
            return;
        }

        $id = Material::create($name, $pricePerKg, (int) ($body['sort_order'] ?? 0));
        Router::json(['id' => $id, 'success' => true], 201);
    }

    public static function adminUpdate(array $params): void
    {
        $id = (int) $params['id'];
        $material = Material::findById($id);

        if (!$material) {
            Router::json(['error' => 'Material nicht gefunden'], 404);
            return;
        }

        $body = Router::getBody();
        Material::update($id, $body);
        Router::json(['success' => true]);
    }
}
