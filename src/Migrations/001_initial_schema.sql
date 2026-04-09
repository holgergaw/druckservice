-- 3D-Druckauftrags-Management — Initiales Datenbankschema

CREATE TABLE IF NOT EXISTS contacts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    auth_token VARCHAR(64) NOT NULL,
    token_expires_at DATETIME NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_token (auth_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS materials (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_per_kg DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS colors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hex_code VARCHAR(7) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    image_path VARCHAR(500) NULL,
    model_path VARCHAR(500) NULL,
    external_url VARCHAR(1000) NULL,
    default_material_id INT UNSIGNED NULL,
    estimated_weight_g DECIMAL(8,2) NULL,
    estimated_time_min INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (default_material_id) REFERENCES materials(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL,
    contact_id INT UNSIGNED NOT NULL,
    source_type ENUM('upload','catalog','link') NOT NULL,
    catalog_item_id INT UNSIGNED NULL,
    external_url VARCHAR(1000) NULL,
    upload_path VARCHAR(500) NULL,
    upload_original_name VARCHAR(255) NULL,
    upload_size_bytes INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    color_id INT UNSIGNED NULL,
    material_id INT UNSIGNED NULL,
    customer_notes TEXT NULL,
    status ENUM('new','reviewed','offered','accepted','rejected','printing','done','delivered','cancelled') NOT NULL DEFAULT 'new',
    is_paid TINYINT(1) NOT NULL DEFAULT 0,
    admin_notes TEXT NULL,
    estimated_weight_g DECIMAL(8,2) NULL,
    estimated_time_min INT UNSIGNED NULL,
    material_cost DECIMAL(8,2) NULL,
    electricity_cost DECIMAL(8,2) NULL,
    total_price DECIMAL(8,2) NULL,
    price_note VARCHAR(500) NULL,
    offered_at DATETIME NULL,
    accepted_at DATETIME NULL,
    completed_at DATETIME NULL,
    delivered_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    UNIQUE KEY uk_order_number (order_number),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE SET NULL,
    FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE SET NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by ENUM('admin','customer','system') NOT NULL,
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_created (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings
INSERT IGNORE INTO settings (`key`, `value`) VALUES
    ('electricity_kwh_rate', '0.30'),
    ('printer_wattage', '200'),
    ('admin_email', '');

-- Default materials
INSERT IGNORE INTO materials (name, price_per_kg, sort_order) VALUES
    ('PLA', 20.00, 1),
    ('PETG', 25.00, 2),
    ('ASA', 28.00, 3),
    ('TPU', 30.00, 4);

-- Default colors
INSERT IGNORE INTO colors (name, hex_code, sort_order) VALUES
    ('Schwarz', '#000000', 1),
    ('Weiß', '#FFFFFF', 2),
    ('Rot', '#FF0000', 3),
    ('Blau', '#0000FF', 4),
    ('Grün', '#00AA00', 5),
    ('Gelb', '#FFDD00', 6),
    ('Grau', '#888888', 7),
    ('Orange', '#FF8800', 8);
