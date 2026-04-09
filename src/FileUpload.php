<?php

declare(strict_types=1);

class FileUpload
{
    private const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

    private const ALLOWED_MODEL_EXTENSIONS = ['stl', '3mf', 'step', 'stp'];
    private const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    /**
     * Upload a 3D model file.
     * Returns ['path' => relative path, 'original_name' => ..., 'size' => bytes] or throws.
     */
    public static function uploadModel(array $file): array
    {
        self::validateFile($file, self::ALLOWED_MODEL_EXTENSIONS);

        $ext = self::getExtension($file['name']);
        $filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $relativePath = 'models/' . $filename;
        $targetPath = self::getUploadsDir() . '/models/' . $filename;

        self::ensureDir(dirname($targetPath));

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new RuntimeException('Datei konnte nicht gespeichert werden');
        }

        return [
            'path' => $relativePath,
            'original_name' => $file['name'],
            'size' => $file['size'],
        ];
    }

    /**
     * Upload a catalog image.
     * Returns the relative path.
     */
    public static function uploadImage(array $file): string
    {
        self::validateFile($file, self::ALLOWED_IMAGE_EXTENSIONS);

        $ext = self::getExtension($file['name']);
        $filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $relativePath = 'catalog/' . $filename;
        $targetPath = self::getUploadsDir() . '/catalog/' . $filename;

        self::ensureDir(dirname($targetPath));

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new RuntimeException('Bild konnte nicht gespeichert werden');
        }

        return $relativePath;
    }

    /**
     * Delete an uploaded file by relative path.
     */
    public static function delete(string $relativePath): void
    {
        $fullPath = self::getUploadsDir() . '/' . $relativePath;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }

    private static function validateFile(array $file, array $allowedExtensions): void
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE => 'Datei zu groß (Server-Limit)',
                UPLOAD_ERR_FORM_SIZE => 'Datei zu groß (Formular-Limit)',
                UPLOAD_ERR_PARTIAL => 'Datei nur teilweise hochgeladen',
                UPLOAD_ERR_NO_FILE => 'Keine Datei ausgewählt',
            ];
            throw new RuntimeException($errors[$file['error']] ?? 'Upload-Fehler');
        }

        if ($file['size'] > self::MAX_SIZE) {
            throw new RuntimeException('Datei zu groß (max. 50 MB)');
        }

        $ext = self::getExtension($file['name']);
        if (!in_array($ext, $allowedExtensions, true)) {
            throw new RuntimeException(
                'Dateityp nicht erlaubt. Erlaubt: ' . implode(', ', $allowedExtensions)
            );
        }
    }

    private static function getExtension(string $filename): string
    {
        return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    }

    private static function getUploadsDir(): string
    {
        // In production (IONOS): symlinked to $HOME/.deploy-now/uploads/
        // Locally: public/uploads/
        $dir = __DIR__ . '/../public/uploads';
        if (!is_dir($dir)) {
            // Fallback for local development
            $dir = __DIR__ . '/../uploads';
        }
        return $dir;
    }

    private static function ensureDir(string $dir): void
    {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}
