<?php

declare(strict_types=1);

/**
 * Database migration runner.
 * Runs all SQL files in src/Migrations/ in order.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS / INSERT IGNORE).
 */

require_once __DIR__ . '/src/bootstrap.php';

echo "=== 3D-Print DB Setup ===\n";

$migrationsDir = __DIR__ . '/src/Migrations';
$files = glob($migrationsDir . '/*.sql');
sort($files);

if (empty($files)) {
    echo "Keine Migrations gefunden.\n";
    exit(0);
}

$pdo = Database::getInstance();

foreach ($files as $file) {
    $filename = basename($file);
    echo "Führe aus: $filename ... ";

    $sql = file_get_contents($file);

    // Split by semicolon, filter empty statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        fn($s) => $s !== ''
    );

    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }

    echo "OK\n";
}

echo "Setup abgeschlossen.\n";
