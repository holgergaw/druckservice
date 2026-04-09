<?php

declare(strict_types=1);

require_once __DIR__ . '/../Models/CatalogItem.php';
require_once __DIR__ . '/../FileUpload.php';

class CatalogController
{
    // --- Public ---

    public static function listPublic(): void
    {
        $items = CatalogItem::listActive();
        // Don't expose internal paths — convert to URLs
        foreach ($items as &$item) {
            $item['image_url'] = $item['image_path']
                ? '/uploads/' . $item['image_path']
                : null;
            unset($item['image_path']);
        }
        Router::json($items);
    }

    public static function getPublic(array $params): void
    {
        $item = CatalogItem::findById((int) $params['id']);
        if (!$item || !$item['is_active']) {
            Router::json(['error' => 'Artikel nicht gefunden'], 404);
            return;
        }
        $item['image_url'] = $item['image_path'] ? '/uploads/' . $item['image_path'] : null;
        unset($item['image_path'], $item['model_path']);
        Router::json($item);
    }

    // --- Admin ---

    public static function adminList(): void
    {
        $items = CatalogItem::listAll();
        foreach ($items as &$item) {
            $item['image_url'] = $item['image_path']
                ? '/uploads/' . $item['image_path']
                : null;
        }
        Router::json($items);
    }

    public static function adminGet(array $params): void
    {
        $item = CatalogItem::findById((int) $params['id']);
        if (!$item) {
            Router::json(['error' => 'Artikel nicht gefunden'], 404);
            return;
        }
        $item['image_url'] = $item['image_path'] ? '/uploads/' . $item['image_path'] : null;
        Router::json($item);
    }

    public static function adminCreate(): void
    {
        $body = Router::getBody();
        $title = trim($body['title'] ?? '');

        if ($title === '') {
            Router::json(['error' => 'Titel erforderlich'], 400);
            return;
        }

        $data = [
            'title' => $title,
            'description' => $body['description'] ?? null,
            'external_url' => $body['external_url'] ?? null,
            'default_material_id' => !empty($body['default_material_id']) ? (int) $body['default_material_id'] : null,
            'estimated_weight_g' => !empty($body['estimated_weight_g']) ? (float) $body['estimated_weight_g'] : null,
            'estimated_time_min' => !empty($body['estimated_time_min']) ? (int) $body['estimated_time_min'] : null,
            'sort_order' => (int) ($body['sort_order'] ?? 0),
        ];

        $id = CatalogItem::create($data);
        Router::json(['id' => $id, 'success' => true], 201);
    }

    public static function adminUpdate(array $params): void
    {
        $id = (int) $params['id'];
        $item = CatalogItem::findById($id);

        if (!$item) {
            Router::json(['error' => 'Artikel nicht gefunden'], 404);
            return;
        }

        $body = Router::getBody();
        CatalogItem::update($id, $body);
        Router::json(['success' => true]);
    }

    public static function adminDelete(array $params): void
    {
        $id = (int) $params['id'];
        $item = CatalogItem::findById($id);

        if (!$item) {
            Router::json(['error' => 'Artikel nicht gefunden'], 404);
            return;
        }

        // Soft delete
        CatalogItem::update($id, ['is_active' => 0]);
        Router::json(['success' => true]);
    }

    public static function uploadImage(array $params): void
    {
        $id = (int) $params['id'];
        $item = CatalogItem::findById($id);

        if (!$item) {
            Router::json(['error' => 'Artikel nicht gefunden'], 404);
            return;
        }

        if (empty($_FILES['image'])) {
            Router::json(['error' => 'Keine Bilddatei'], 400);
            return;
        }

        try {
            // Delete old image if exists
            if ($item['image_path']) {
                FileUpload::delete($item['image_path']);
            }

            $path = FileUpload::uploadImage($_FILES['image']);
            CatalogItem::update($id, ['image_path' => $path]);

            Router::json([
                'success' => true,
                'image_url' => '/uploads/' . $path,
            ]);
        } catch (RuntimeException $e) {
            Router::json(['error' => $e->getMessage()], 400);
        }
    }
}
