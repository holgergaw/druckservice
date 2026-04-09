<?php

declare(strict_types=1);

// Front Controller — all API requests route through here

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Bootstrap
require_once __DIR__ . '/../src/bootstrap.php';
require_once __DIR__ . '/../src/Router.php';

$router = new Router();

// --- Public Routes ---

// Catalog
$router->get('/catalog', function () {
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::listPublic();
});

$router->get('/catalog/{id}', function (array $params) {
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::getPublic($params);
});

// Materials & Colors
$router->get('/materials', function () {
    require_once __DIR__ . '/../src/Controllers/MaterialController.php';
    MaterialController::listPublic();
});

$router->get('/colors', function () {
    require_once __DIR__ . '/../src/Controllers/ColorController.php';
    ColorController::listPublic();
});

// Orders (public)
$router->post('/orders', function () {
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::create();
});

$router->get('/orders/{nr}', function (array $params) {
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::getByNumber($params);
});

$router->post('/orders/{nr}/accept', function (array $params) {
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::accept($params);
});

$router->post('/orders/{nr}/decline', function (array $params) {
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::decline($params);
});

// --- Admin Routes ---

// Auth
$router->post('/admin/login', function () {
    require_once __DIR__ . '/../src/Controllers/AdminController.php';
    AdminController::login();
});

$router->post('/admin/logout', function () {
    require_once __DIR__ . '/../src/Controllers/AdminController.php';
    AdminController::logout();
});

$router->get('/admin/auth', function () {
    require_once __DIR__ . '/../src/Controllers/AdminController.php';
    AdminController::checkAuth();
});

// Admin: Stats
$router->get('/admin/stats', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/AdminController.php';
    AdminController::stats();
});

// Admin: Orders
$router->get('/admin/orders', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::adminList();
});

$router->get('/admin/orders/{id}', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::adminGet($params);
});

$router->patch('/admin/orders/{id}', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::adminUpdate($params);
});

$router->post('/admin/orders/{id}/offer', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::sendOffer($params);
});

$router->post('/admin/orders/{id}/reject', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/OrderController.php';
    OrderController::reject($params);
});

// Admin: Catalog
$router->get('/admin/catalog', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::adminList();
});

$router->post('/admin/catalog', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::adminCreate();
});

$router->get('/admin/catalog/{id}', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::adminGet($params);
});

$router->patch('/admin/catalog/{id}', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::adminUpdate($params);
});

$router->delete('/admin/catalog/{id}', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::adminDelete($params);
});

$router->post('/admin/catalog/{id}/image', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/CatalogController.php';
    CatalogController::uploadImage($params);
});

// Admin: Materials
$router->get('/admin/materials', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/MaterialController.php';
    MaterialController::adminList();
});

$router->post('/admin/materials', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/MaterialController.php';
    MaterialController::adminCreate();
});

$router->patch('/admin/materials/{id}', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/MaterialController.php';
    MaterialController::adminUpdate($params);
});

// Admin: Colors
$router->get('/admin/colors', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/ColorController.php';
    ColorController::adminList();
});

$router->post('/admin/colors', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/ColorController.php';
    ColorController::adminCreate();
});

$router->patch('/admin/colors/{id}', function (array $params) {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/ColorController.php';
    ColorController::adminUpdate($params);
});

// Admin: Settings
$router->get('/admin/settings', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/SettingsController.php';
    SettingsController::getAll();
});

$router->put('/admin/settings', function () {
    Router::requireAdmin();
    require_once __DIR__ . '/../src/Controllers/SettingsController.php';
    SettingsController::updateAll();
});

// Dispatch
$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
