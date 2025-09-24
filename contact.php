<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';
require __DIR__ . '/PHPMailer/src/Exception.php';

// ---------------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
    'https://www.quartzclinique.com',
    'https://quartzclinique.com',
    'http://localhost',
    'http://127.0.0.1'
];
const RATE_LIMIT_WINDOW = 900;       // seconds (15 minutes)
const RATE_LIMIT_MAX    = 5;         // max attempts per window
const LOG_MAX_BYTES     = 1048576;   // 1 MB

function storageDir(): string
{
    $dir = getenv('MAIL_PROTECT_DIR');
    if (!$dir) {
        $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'quartz_mail';
    }
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return $dir;
}

function rateLimitFile(): string
{
    return storageDir() . DIRECTORY_SEPARATOR . 'rate_limit.json';
}

function logFile(): string
{
    return storageDir() . DIRECTORY_SEPARATOR . 'mailer.log';
}

function respond(bool $success, string $message, int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

function logError(string $code, string $detail): void
{
    $file = logFile();
    if (file_exists($file) && filesize($file) > LOG_MAX_BYTES) {
        file_put_contents($file, '');
    }
    $line = sprintf('[%s] %s: %s%s', date('c'), $code, $detail, PHP_EOL);
    error_log($line, 3, $file);
}

function getRequestData(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $rawInput    = file_get_contents('php://input');

    if (stripos($contentType, 'application/json') !== false) {
        $json = json_decode($rawInput, true);
        if (is_array($json)) {
            return $json;
        }
    }

    return $_POST;
}

function sanitizeField(string $value, int $maxLen = 200): string
{
    $value = trim(strip_tags($value));
    $value = preg_replace('/[\r\n]+/', ' ', $value);
    return mb_substr($value, 0, $maxLen, 'UTF-8');
}

function sanitizeMessage(string $value): string
{
    $value = trim(strip_tags($value));
    $value = str_replace("\0", '', $value);
    $value = preg_replace('/\r\n?/', "\n", $value);
    $lines = explode("\n", $value);
    $lines = array_slice($lines, 0, 50);
    $value = implode("\n", $lines);
    return mb_substr($value, 0, 1000, 'UTF-8');
}

// ---------------------------------------------------------------------------------
// Method check
// ---------------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Method not allowed.', 405);
}

// ---------------------------------------------------------------------------------
// Origin & CSRF validation
// ---------------------------------------------------------------------------------
$originHeader = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$originScheme = parse_url($originHeader, PHP_URL_SCHEME);
$originHost   = parse_url($originHeader, PHP_URL_HOST);
$originBase   = $originScheme && $originHost ? strtolower($originScheme . '://' . $originHost) : '';

if ($originBase && !in_array($originBase, ALLOWED_ORIGINS, true)) {
    logError('ORIGIN', $originBase ?: 'missing');
    respond(false, 'Invalid request origin.', 403);
}

$csrfToken = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrfToken)) {
    logError('CSRF', 'Token mismatch');
    respond(false, 'Security token mismatch.', 403);
}
unset($_SESSION['csrf_token']);

// ---------------------------------------------------------------------------------
// Rate limiting (per IP)
// ---------------------------------------------------------------------------------
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$tokenKey = hash('sha256', $clientIp);
$now      = time();

$rateFile = rateLimitFile();
$rateData = [];
if (file_exists($rateFile)) {
    $json     = file_get_contents($rateFile);
    $rateData = json_decode($json, true);
    if (!is_array($rateData)) {
        $rateData = [];
    }
}

$times = $rateData[$tokenKey] ?? [];
$times = array_values(array_filter($times, static fn ($ts) => ($now - (int) $ts) < RATE_LIMIT_WINDOW));

if (count($times) >= RATE_LIMIT_MAX) {
    logError('RLIMIT', $clientIp);
    respond(false, 'Too many requests. Please try again later.', 429);
}

$times[]             = $now;
$rateData[$tokenKey] = $times;
file_put_contents($rateFile, json_encode($rateData, JSON_UNESCAPED_UNICODE), LOCK_EX);

// ---------------------------------------------------------------------------------
// Input handling and validation
// ---------------------------------------------------------------------------------
$data = getRequestData();

$name     = sanitizeField($data['name'] ?? '', 120);
$phone    = sanitizeField($data['phone'] ?? '', 60);
$email    = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
$service  = sanitizeField($data['service'] ?? '', 120);
$location = sanitizeField($data['location'] ?? '', 120);
$message  = sanitizeMessage($data['message'] ?? '');

if ($name === '' || $phone === '' || $email === '' || $service === '' || $location === '') {
    respond(false, 'Please fill in all required fields.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.');
}

// ---------------------------------------------------------------------------------
// Prepare mail content
// ---------------------------------------------------------------------------------
$body  = "Quartz Clinique Partnership Application\n\n";
$body .= "Name     : {$name}\n";
$body .= "Phone    : {$phone}\n";
$body .= "Email    : {$email}\n";
$body .= "Service  : {$service}\n";
$body .= "Location : {$location}\n";
if ($message !== '') {
    $body .= "Message  : {$message}\n";
}
$body .= "IP       : {$clientIp}\n";
$body .= 'Date     : ' . date('d.m.Y H:i:s') . "\n";

// ---------------------------------------------------------------------------------
// SMTP configuration via environment
// ---------------------------------------------------------------------------------
$smtpHost = getenv('SMTP_HOST');
$smtpUser = getenv('SMTP_USERNAME');
$smtpPass = getenv('SMTP_PASSWORD');
$smtpPort = (int) (getenv('SMTP_PORT') ?: 465);

if (!$smtpHost || !$smtpUser || !$smtpPass) {
    logError('CONFIG', 'Missing SMTP environment variables');
    respond(false, 'Mail configuration error.', 500);
}

$fromEmail = getenv('SMTP_FROM_EMAIL') ?: $smtpUser;
$fromName  = getenv('SMTP_FROM_NAME') ?: 'Quartz Clinique';
$toEmail   = getenv('SMTP_TO_EMAIL') ?: 'contact@quartzclinique.com';
$subject   = getenv('SMTP_SUBJECT') ?: 'Quartz Clinique - Partnership Form';

// ---------------------------------------------------------------------------------
// Send mail via PHPMailer
// ---------------------------------------------------------------------------------
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = $smtpHost;
    $mail->Port       = $smtpPort;
    $mail->SMTPAuth   = true;
    $mail->Username   = $smtpUser;
    $mail->Password   = $smtpPass;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom($fromEmail, $fromName);
    $mail->addAddress($toEmail);
    if ($bcc = getenv('SMTP_BCC')) {
        $mail->addBCC($bcc);
    }
    $replyName = $name !== '' ? $name : 'Form User';
    $mail->addReplyTo($email, $replyName);

    $mail->Subject = $subject;
    $mail->Body    = $body;
    $mail->AltBody = $body;

    $mail->send();
    respond(true, 'Randevu talebiniz başarıyla gönderildi! En kısa sürede size dönüş yapacağız.');
} catch (Exception $e) {
    $errorHash = substr(hash('sha256', $mail->ErrorInfo), 0, 12);
    logError('SMTP', $errorHash);
    respond(false, 'E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 500);
}

// SPF/DKIM/DMARC notu: DNS kayıtlarınızda ms7.guzel.net.tr IP’sini yetkilendiren SPF kaydı ve ilgili DKIM/DMARC
// ayarlarını yapılandırmayı unutmayın; aksi hâlde bazı sağlayıcılar (örneğin Gmail) iletileri geciktirebilir veya spam olarak işaretleyebilir.



