<?php

declare(strict_types=1);

require_once __DIR__ . '/../Models/Order.php';
require_once __DIR__ . '/../Models/Contact.php';
require_once __DIR__ . '/../Models/Setting.php';
require_once __DIR__ . '/../FileUpload.php';
require_once __DIR__ . '/../Mailer.php';

class OrderController
{
    // --- Public ---

    public static function create(): void
    {
        $body = Router::getBody();

        // Validate contact info
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $phone = trim($body['phone'] ?? '') ?: null;

        if ($name === '' || $email === '') {
            Router::json(['error' => 'Name und E-Mail sind erforderlich'], 400);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Router::json(['error' => 'Ungültige E-Mail-Adresse'], 400);
            return;
        }

        // Rate limiting
        if (Order::countRecentByEmail($email) >= 5) {
            Router::json(['error' => 'Zu viele Anfragen. Bitte versuche es später erneut.'], 429);
            return;
        }

        // Validate source type
        $sourceType = $body['source_type'] ?? '';
        if (!in_array($sourceType, ['upload', 'catalog', 'link'])) {
            Router::json(['error' => 'Ungültige Modell-Quelle'], 400);
            return;
        }

        // Find or create contact
        $contact = Contact::findOrCreate($name, $email, $phone);

        // Build order data
        $orderData = [
            'contact_id' => $contact['id'],
            'source_type' => $sourceType,
            'quantity' => max(1, (int) ($body['quantity'] ?? 1)),
            'color_id' => !empty($body['color_id']) ? (int) $body['color_id'] : null,
            'material_id' => !empty($body['material_id']) ? (int) $body['material_id'] : null,
            'customer_notes' => trim($body['customer_notes'] ?? '') ?: null,
        ];

        // Handle source-specific data
        switch ($sourceType) {
            case 'upload':
                if (empty($_FILES['model'])) {
                    Router::json(['error' => 'Keine 3D-Datei hochgeladen'], 400);
                    return;
                }
                try {
                    $upload = FileUpload::uploadModel($_FILES['model']);
                    $orderData['upload_path'] = $upload['path'];
                    $orderData['upload_original_name'] = $upload['original_name'];
                    $orderData['upload_size_bytes'] = $upload['size'];
                } catch (RuntimeException $e) {
                    Router::json(['error' => $e->getMessage()], 400);
                    return;
                }
                break;

            case 'catalog':
                $catalogId = (int) ($body['catalog_item_id'] ?? 0);
                if ($catalogId <= 0) {
                    Router::json(['error' => 'Kein Katalog-Artikel ausgewählt'], 400);
                    return;
                }
                $orderData['catalog_item_id'] = $catalogId;
                break;

            case 'link':
                $url = trim($body['external_url'] ?? '');
                if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
                    Router::json(['error' => 'Ungültiger Link zum 3D-Modell'], 400);
                    return;
                }
                $orderData['external_url'] = $url;
                break;
        }

        $orderId = Order::create($orderData);
        $order = Order::findById($orderId);

        // Notify admin
        Mailer::notifyAdmin($order['order_number'], $name);

        Router::json([
            'success' => true,
            'order_number' => $order['order_number'],
            'token' => $contact['token'],
        ], 201);
    }

    public static function getByNumber(array $params): void
    {
        $token = $_GET['token'] ?? '';
        if ($token === '') {
            Router::json(['error' => 'Token erforderlich'], 401);
            return;
        }

        $order = Order::findByNumber($params['nr']);
        if (!$order) {
            Router::json(['error' => 'Auftrag nicht gefunden'], 404);
            return;
        }

        // Verify token belongs to this order's contact
        if (!hash_equals($order['auth_token'], $token)) {
            Router::json(['error' => 'Ungültiger Token'], 403);
            return;
        }

        // Return public-safe order data
        Router::json(self::publicOrderData($order));
    }

    public static function accept(array $params): void
    {
        $token = $_GET['token'] ?? '';
        $order = self::validateCustomerAccess($params['nr'], $token);
        if (!$order) {
            return;
        }

        if ($order['status'] !== 'offered') {
            Router::json(['error' => 'Auftrag kann in diesem Status nicht angenommen werden'], 400);
            return;
        }

        Order::updateStatus((int) $order['id'], 'accepted', 'customer');
        Router::json(['success' => true, 'status' => 'accepted']);
    }

    public static function decline(array $params): void
    {
        $token = $_GET['token'] ?? '';
        $order = self::validateCustomerAccess($params['nr'], $token);
        if (!$order) {
            return;
        }

        if ($order['status'] !== 'offered') {
            Router::json(['error' => 'Auftrag kann in diesem Status nicht abgelehnt werden'], 400);
            return;
        }

        Order::updateStatus((int) $order['id'], 'cancelled', 'customer', 'Vom Kunden abgelehnt');
        Router::json(['success' => true, 'status' => 'cancelled']);
    }

    // --- Admin ---

    public static function adminList(): void
    {
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        Router::json(Order::adminList($status, $search));
    }

    public static function adminGet(array $params): void
    {
        $order = Order::findById((int) $params['id']);
        if (!$order) {
            Router::json(['error' => 'Auftrag nicht gefunden'], 404);
            return;
        }

        // Include status history
        $order['status_history'] = Order::getStatusHistory((int) $order['id']);

        // Add download URL for uploads
        if ($order['upload_path']) {
            $order['upload_url'] = '/uploads/' . $order['upload_path'];
        }

        Router::json($order);
    }

    public static function adminUpdate(array $params): void
    {
        $id = (int) $params['id'];
        $order = Order::findById($id);

        if (!$order) {
            Router::json(['error' => 'Auftrag nicht gefunden'], 404);
            return;
        }

        $body = Router::getBody();

        // If status is changing, use the status update method
        if (isset($body['status']) && $body['status'] !== $order['status']) {
            Order::updateStatus($id, $body['status'], 'admin', $body['status_comment'] ?? null);
            unset($body['status'], $body['status_comment']);

            // Send email if status is 'done'
            if (($body['status'] ?? $order['status']) === 'done' ||
                (isset($params['status']) && $params['status'] === 'done')) {
                $freshOrder = Order::findById($id);
                if ($freshOrder && $freshOrder['status'] === 'done') {
                    $appUrl = env('APP_URL', '');
                    $link = "$appUrl/#/order/{$freshOrder['order_number']}?token={$freshOrder['auth_token']}";
                    Mailer::send(
                        $freshOrder['contact_email'],
                        "Dein Druck ist fertig: {$freshOrder['order_number']}",
                        Mailer::template('customer_done', [
                            'order_number' => $freshOrder['order_number'],
                            'customer_name' => $freshOrder['contact_name'],
                            'link' => $link,
                        ])
                    );
                }
            }
        }

        // Update remaining fields
        if (!empty($body)) {
            Order::update($id, $body);
        }

        Router::json(['success' => true]);
    }

    public static function sendOffer(array $params): void
    {
        $id = (int) $params['id'];
        $order = Order::findById($id);

        if (!$order) {
            Router::json(['error' => 'Auftrag nicht gefunden'], 404);
            return;
        }

        if (empty($order['total_price'])) {
            Router::json(['error' => 'Bitte zuerst einen Preis festlegen'], 400);
            return;
        }

        // Update status
        Order::updateStatus($id, 'offered', 'admin');

        // Send email
        $appUrl = env('APP_URL', '');
        $link = "$appUrl/#/order/{$order['order_number']}?token={$order['auth_token']}";

        $sent = Mailer::send(
            $order['contact_email'],
            "Angebot für deine Druckanfrage: {$order['order_number']}",
            Mailer::template('customer_offer', [
                'order_number' => $order['order_number'],
                'customer_name' => $order['contact_name'],
                'price' => number_format((float) $order['total_price'], 2, ',', '.'),
                'price_note' => $order['price_note'] ?? '',
                'link' => $link,
            ])
        );

        Router::json([
            'success' => true,
            'email_sent' => $sent,
        ]);
    }

    public static function reject(array $params): void
    {
        $id = (int) $params['id'];
        $order = Order::findById($id);

        if (!$order) {
            Router::json(['error' => 'Auftrag nicht gefunden'], 404);
            return;
        }

        $body = Router::getBody();
        $reason = trim($body['reason'] ?? '');

        Order::updateStatus($id, 'rejected', 'admin', $reason);

        // Send email
        Mailer::send(
            $order['contact_email'],
            "Druckanfrage {$order['order_number']} abgelehnt",
            Mailer::template('customer_rejected', [
                'order_number' => $order['order_number'],
                'customer_name' => $order['contact_name'],
                'reason' => $reason,
            ])
        );

        Router::json(['success' => true]);
    }

    // --- Helpers ---

    private static function validateCustomerAccess(string $orderNumber, string $token): ?array
    {
        if ($token === '') {
            Router::json(['error' => 'Token erforderlich'], 401);
            return null;
        }

        $order = Order::findByNumber($orderNumber);
        if (!$order) {
            Router::json(['error' => 'Auftrag nicht gefunden'], 404);
            return null;
        }

        if (!hash_equals($order['auth_token'], $token)) {
            Router::json(['error' => 'Ungültiger Token'], 403);
            return null;
        }

        return $order;
    }

    private static function publicOrderData(array $order): array
    {
        return [
            'order_number' => $order['order_number'],
            'status' => $order['status'],
            'source_type' => $order['source_type'],
            'catalog_title' => $order['catalog_title'] ?? null,
            'external_url' => $order['external_url'],
            'upload_original_name' => $order['upload_original_name'],
            'quantity' => (int) $order['quantity'],
            'color_name' => $order['color_name'] ?? null,
            'hex_code' => $order['hex_code'] ?? null,
            'material_name' => $order['material_name'] ?? null,
            'customer_notes' => $order['customer_notes'],
            'total_price' => $order['total_price'] ? (float) $order['total_price'] : null,
            'price_note' => $order['price_note'],
            'is_paid' => (bool) $order['is_paid'],
            'created_at' => $order['created_at'],
            'offered_at' => $order['offered_at'],
            'accepted_at' => $order['accepted_at'],
            'completed_at' => $order['completed_at'],
            'delivered_at' => $order['delivered_at'],
        ];
    }
}
