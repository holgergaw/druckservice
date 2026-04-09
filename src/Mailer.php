<?php

declare(strict_types=1);

class Mailer
{
    /**
     * Send an email via SMTP (IONOS).
     * Uses PHP's mail() as fallback if SMTP is not configured.
     */
    public static function send(string $to, string $subject, string $htmlBody): bool
    {
        $from = env('MAIL_FROM', 'noreply@example.com');
        $fromName = env('MAIL_FROM_NAME', '3D-Druckservice');

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            "From: $fromName <$from>",
            "Reply-To: $from",
            'X-Mailer: PHP/' . phpversion(),
        ];

        $smtpHost = env('MAIL_HOST');

        if ($smtpHost !== '') {
            return self::sendSmtp($to, $subject, $htmlBody, $from, $fromName);
        }

        // Fallback to PHP mail()
        return mail($to, $subject, $htmlBody, implode("\r\n", $headers));
    }

    private static function sendSmtp(
        string $to,
        string $subject,
        string $body,
        string $from,
        string $fromName
    ): bool {
        $host = env('MAIL_HOST');
        $port = (int) env('MAIL_PORT', '587');
        $user = env('MAIL_USER');
        $pass = env('MAIL_PASS');

        $socket = @fsockopen(
            ($port === 465 ? 'ssl://' : '') . $host,
            $port,
            $errno,
            $errstr,
            10
        );

        if (!$socket) {
            error_log("SMTP Verbindung fehlgeschlagen: $errstr ($errno)");
            return false;
        }

        $response = self::smtpRead($socket);

        $commands = [
            "EHLO " . gethostname(),
        ];

        // STARTTLS for port 587
        if ($port === 587) {
            $commands[] = "STARTTLS";
        }

        foreach ($commands as $cmd) {
            self::smtpWrite($socket, $cmd);
            $response = self::smtpRead($socket);

            if ($cmd === "STARTTLS" && str_starts_with($response, '220')) {
                stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                self::smtpWrite($socket, "EHLO " . gethostname());
                self::smtpRead($socket);
            }
        }

        // AUTH LOGIN
        self::smtpWrite($socket, "AUTH LOGIN");
        self::smtpRead($socket);
        self::smtpWrite($socket, base64_encode($user));
        self::smtpRead($socket);
        self::smtpWrite($socket, base64_encode($pass));
        $authResponse = self::smtpRead($socket);

        if (!str_starts_with($authResponse, '235')) {
            error_log("SMTP Auth fehlgeschlagen: $authResponse");
            fclose($socket);
            return false;
        }

        // Envelope
        self::smtpWrite($socket, "MAIL FROM:<$from>");
        self::smtpRead($socket);
        self::smtpWrite($socket, "RCPT TO:<$to>");
        self::smtpRead($socket);
        self::smtpWrite($socket, "DATA");
        self::smtpRead($socket);

        // Message
        $message = "From: $fromName <$from>\r\n";
        $message .= "To: $to\r\n";
        $message .= "Subject: $subject\r\n";
        $message .= "MIME-Version: 1.0\r\n";
        $message .= "Content-Type: text/html; charset=UTF-8\r\n";
        $message .= "\r\n";
        $message .= $body;

        self::smtpWrite($socket, $message . "\r\n.");
        $dataResponse = self::smtpRead($socket);

        self::smtpWrite($socket, "QUIT");
        fclose($socket);

        return str_starts_with($dataResponse, '250');
    }

    private static function smtpWrite($socket, string $data): void
    {
        fwrite($socket, $data . "\r\n");
    }

    private static function smtpRead($socket): string
    {
        $response = '';
        while ($line = fgets($socket, 512)) {
            $response .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return trim($response);
    }

    /**
     * Send admin notification about a new order.
     */
    public static function notifyAdmin(string $orderNumber, string $customerName): bool
    {
        $adminEmail = env('ADMIN_EMAIL', '');
        if ($adminEmail === '') {
            // Try from settings
            $setting = Database::fetchOne("SELECT `value` FROM settings WHERE `key` = ?", ['admin_email']);
            $adminEmail = $setting['value'] ?? '';
        }

        if ($adminEmail === '') {
            return false;
        }

        $subject = "Neue Druckanfrage: $orderNumber";
        $body = self::template('admin_new_order', [
            'order_number' => $orderNumber,
            'customer_name' => $customerName,
        ]);

        return self::send($adminEmail, $subject, $body);
    }

    /**
     * Simple template engine — replaces {{key}} placeholders.
     */
    public static function template(string $name, array $vars): string
    {
        $templates = [
            'admin_new_order' => '
                <h2>Neue Druckanfrage</h2>
                <p>Eine neue Anfrage <strong>{{order_number}}</strong> von <strong>{{customer_name}}</strong> ist eingegangen.</p>
                <p>Bitte prüfe die Anfrage im Admin-Panel.</p>
            ',
            'customer_offer' => '
                <h2>Dein Druckauftrag {{order_number}}</h2>
                <p>Hallo {{customer_name}},</p>
                <p>ich habe deine Anfrage geprüft und kann dir folgendes Angebot machen:</p>
                <p><strong>Preis: {{price}} EUR</strong></p>
                {{#price_note}}<p>{{price_note}}</p>{{/price_note}}
                <p><a href="{{link}}">Angebot ansehen und annehmen/ablehnen</a></p>
                <p>Viele Grüße</p>
            ',
            'customer_rejected' => '
                <h2>Druckanfrage {{order_number}}</h2>
                <p>Hallo {{customer_name}},</p>
                <p>leider kann ich deine Anfrage nicht umsetzen.</p>
                {{#reason}}<p><strong>Grund:</strong> {{reason}}</p>{{/reason}}
                <p>Du kannst jederzeit eine neue Anfrage stellen.</p>
                <p>Viele Grüße</p>
            ',
            'customer_done' => '
                <h2>Dein Druck ist fertig! 🎉</h2>
                <p>Hallo {{customer_name}},</p>
                <p>dein Auftrag <strong>{{order_number}}</strong> ist fertig gedruckt und kann abgeholt werden.</p>
                <p><a href="{{link}}">Status ansehen</a></p>
                <p>Viele Grüße</p>
            ',
        ];

        $html = $templates[$name] ?? '<p>Template nicht gefunden</p>';

        // Replace simple vars
        foreach ($vars as $key => $value) {
            $html = str_replace('{{' . $key . '}}', htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'), $html);
        }

        // Handle conditional blocks {{#key}}...{{/key}}
        $html = preg_replace_callback(
            '/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/s',
            function ($matches) use ($vars) {
                $key = $matches[1];
                return !empty($vars[$key]) ? $matches[2] : '';
            },
            $html
        );

        // Wrap in basic HTML
        return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' . $html . '</body></html>';
    }
}
