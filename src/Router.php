<?php

declare(strict_types=1);

class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }

    public function patch(string $path, callable $handler): void
    {
        $this->addRoute('PATCH', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }

    private function addRoute(string $method, string $path, callable $handler): void
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $uri): void
    {
        // Remove query string
        $uri = parse_url($uri, PHP_URL_PATH);

        // Remove /api prefix
        $uri = preg_replace('#^/api#', '', $uri);

        // Remove trailing slash (except for root)
        if ($uri !== '/') {
            $uri = rtrim($uri, '/');
        }

        // Default to root
        if ($uri === '' || $uri === false) {
            $uri = '/';
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->matchRoute($route['path'], $uri);
            if ($params !== false) {
                call_user_func($route['handler'], $params);
                return;
            }
        }

        self::json(['error' => 'Endpunkt nicht gefunden'], 404);
    }

    private function matchRoute(string $pattern, string $uri): array|false
    {
        // Convert route pattern to regex: {param} -> named capture group
        $regex = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $uri, $matches)) {
            // Return only named captures
            return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        }

        return false;
    }

    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    public static function getBody(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (str_contains($contentType, 'application/json')) {
            $body = json_decode(file_get_contents('php://input'), true);
            return is_array($body) ? $body : [];
        }

        // For multipart/form-data, PHP auto-populates $_POST and $_FILES
        return $_POST;
    }

    public static function requireAdmin(): void
    {
        require_once __DIR__ . '/Auth.php';

        if (!Auth::isLoggedIn()) {
            self::json(['error' => 'Nicht autorisiert'], 401);
            exit;
        }

        // CSRF check for state-changing methods
        $method = $_SERVER['REQUEST_METHOD'];
        if (in_array($method, ['POST', 'PATCH', 'PUT', 'DELETE'])) {
            $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            if (!Auth::validateCsrf($token)) {
                self::json(['error' => 'Ungültiger CSRF-Token'], 403);
                exit;
            }
        }
    }
}
