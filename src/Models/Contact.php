<?php

declare(strict_types=1);

class Contact
{
    public static function findByEmail(string $email): ?array
    {
        return Database::fetchOne("SELECT * FROM contacts WHERE email = ?", [$email]);
    }

    public static function findByToken(string $token): ?array
    {
        return Database::fetchOne(
            "SELECT * FROM contacts WHERE auth_token = ? AND (token_expires_at IS NULL OR token_expires_at > NOW())",
            [$token]
        );
    }

    public static function findById(int $id): ?array
    {
        return Database::fetchOne("SELECT * FROM contacts WHERE id = ?", [$id]);
    }

    /**
     * Find or create a contact by email.
     * Returns the contact's ID and a fresh auth_token.
     */
    public static function findOrCreate(string $name, string $email, ?string $phone = null): array
    {
        $existing = self::findByEmail($email);

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

        if ($existing) {
            // Update token and optionally name/phone
            Database::update('contacts', [
                'name' => $name,
                'phone' => $phone,
                'auth_token' => $token,
                'token_expires_at' => $expiresAt,
            ], 'id = ?', [$existing['id']]);

            return ['id' => (int) $existing['id'], 'token' => $token];
        }

        $id = Database::insert('contacts', [
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'auth_token' => $token,
            'token_expires_at' => $expiresAt,
        ]);

        return ['id' => $id, 'token' => $token];
    }

    public static function listAll(): array
    {
        return Database::fetchAll("SELECT * FROM contacts ORDER BY created_at DESC");
    }
}
