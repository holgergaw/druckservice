<?php

declare(strict_types=1);

require_once __DIR__ . '/../Models/Color.php';

class ColorController
{
    public static function listPublic(): void
    {
        Router::json(Color::listActive());
    }

    public static function adminList(): void
    {
        Router::json(Color::listAll());
    }

    public static function adminCreate(): void
    {
        $body = Router::getBody();
        $name = trim($body['name'] ?? '');

        if ($name === '') {
            Router::json(['error' => 'Name erforderlich'], 400);
            return;
        }

        $id = Color::create($name, $body['hex_code'] ?? null, (int) ($body['sort_order'] ?? 0));
        Router::json(['id' => $id, 'success' => true], 201);
    }

    public static function adminUpdate(array $params): void
    {
        $id = (int) $params['id'];
        $color = Color::findById($id);

        if (!$color) {
            Router::json(['error' => 'Farbe nicht gefunden'], 404);
            return;
        }

        $body = Router::getBody();
        Color::update($id, $body);
        Router::json(['success' => true]);
    }
}
