<?php

declare(strict_types=1);

class Order
{
    /**
     * Generate a unique order number: ORD-YYYY-XXXX
     */
    public static function generateNumber(): string
    {
        $year = date('Y');
        $result = Database::fetchOne(
            "SELECT MAX(CAST(SUBSTRING(order_number, 10) AS UNSIGNED)) AS max_num
             FROM orders
             WHERE order_number LIKE ?",
            ["ORD-$year-%"]
        );
        $next = ($result['max_num'] ?? 0) + 1;
        return sprintf("ORD-%s-%04d", $year, $next);
    }

    public static function create(array $data): int
    {
        $data['order_number'] = self::generateNumber();

        $allowed = [
            'order_number', 'contact_id', 'source_type', 'catalog_item_id',
            'external_url', 'upload_path', 'upload_original_name', 'upload_size_bytes',
            'quantity', 'color_id', 'material_id', 'customer_notes',
        ];
        $filtered = array_intersect_key($data, array_flip($allowed));

        $id = Database::insert('orders', $filtered);

        // Log initial status
        self::logStatus($id, null, 'new', 'system');

        return $id;
    }

    public static function findById(int $id): ?array
    {
        return Database::fetchOne(
            "SELECT o.*,
                    c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone, c.auth_token,
                    col.name AS color_name, col.hex_code,
                    mat.name AS material_name, mat.price_per_kg,
                    cat.title AS catalog_title
             FROM orders o
             JOIN contacts c ON o.contact_id = c.id
             LEFT JOIN colors col ON o.color_id = col.id
             LEFT JOIN materials mat ON o.material_id = mat.id
             LEFT JOIN catalog_items cat ON o.catalog_item_id = cat.id
             WHERE o.id = ?",
            [$id]
        );
    }

    public static function findByNumber(string $orderNumber): ?array
    {
        return Database::fetchOne(
            "SELECT o.*,
                    c.name AS contact_name, c.email AS contact_email, c.auth_token,
                    col.name AS color_name, col.hex_code,
                    mat.name AS material_name,
                    cat.title AS catalog_title
             FROM orders o
             JOIN contacts c ON o.contact_id = c.id
             LEFT JOIN colors col ON o.color_id = col.id
             LEFT JOIN materials mat ON o.material_id = mat.id
             LEFT JOIN catalog_items cat ON o.catalog_item_id = cat.id
             WHERE o.order_number = ?",
            [$orderNumber]
        );
    }

    public static function adminList(?string $status = null, ?string $search = null): array
    {
        $sql = "SELECT o.*, c.name AS contact_name, c.email AS contact_email,
                       col.name AS color_name, mat.name AS material_name
                FROM orders o
                JOIN contacts c ON o.contact_id = c.id
                LEFT JOIN colors col ON o.color_id = col.id
                LEFT JOIN materials mat ON o.material_id = mat.id";
        $params = [];
        $conditions = [];

        if ($status !== null && $status !== '') {
            $conditions[] = "o.status = ?";
            $params[] = $status;
        }

        if ($search !== null && $search !== '') {
            $conditions[] = "(o.order_number LIKE ? OR c.name LIKE ? OR c.email LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }

        $sql .= " ORDER BY o.created_at DESC";

        return Database::fetchAll($sql, $params);
    }

    public static function updateStatus(int $id, string $newStatus, string $changedBy, ?string $comment = null): void
    {
        $order = Database::fetchOne("SELECT status FROM orders WHERE id = ?", [$id]);
        if (!$order) {
            return;
        }

        $oldStatus = $order['status'];
        $updateData = ['status' => $newStatus];

        // Set timestamps based on status
        switch ($newStatus) {
            case 'offered':
                $updateData['offered_at'] = date('Y-m-d H:i:s');
                break;
            case 'accepted':
                $updateData['accepted_at'] = date('Y-m-d H:i:s');
                break;
            case 'done':
                $updateData['completed_at'] = date('Y-m-d H:i:s');
                break;
            case 'delivered':
                $updateData['delivered_at'] = date('Y-m-d H:i:s');
                break;
        }

        Database::update('orders', $updateData, 'id = ?', [$id]);
        self::logStatus($id, $oldStatus, $newStatus, $changedBy, $comment);
    }

    public static function update(int $id, array $data): void
    {
        $allowed = [
            'admin_notes', 'estimated_weight_g', 'estimated_time_min',
            'material_cost', 'electricity_cost', 'total_price', 'price_note',
            'is_paid', 'status',
        ];
        $filtered = array_intersect_key($data, array_flip($allowed));
        if (!empty($filtered)) {
            Database::update('orders', $filtered, 'id = ?', [$id]);
        }
    }

    public static function getStatusHistory(int $orderId): array
    {
        return Database::fetchAll(
            "SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC",
            [$orderId]
        );
    }

    public static function getStatusCounts(): array
    {
        $rows = Database::fetchAll("SELECT status, COUNT(*) AS count FROM orders GROUP BY status");
        $counts = [];
        foreach ($rows as $row) {
            $counts[$row['status']] = (int) $row['count'];
        }
        return $counts;
    }

    /**
     * Rate limiting: count orders from an email in the last hour.
     */
    public static function countRecentByEmail(string $email): int
    {
        $result = Database::fetchOne(
            "SELECT COUNT(*) AS cnt FROM orders o
             JOIN contacts c ON o.contact_id = c.id
             WHERE c.email = ? AND o.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
            [$email]
        );
        return (int) ($result['cnt'] ?? 0);
    }

    private static function logStatus(int $orderId, ?string $oldStatus, string $newStatus, string $changedBy, ?string $comment = null): void
    {
        Database::insert('order_status_history', [
            'order_id' => $orderId,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'changed_by' => $changedBy,
            'comment' => $comment,
        ]);
    }
}
