<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';
require_once __DIR__ . '/PHPMailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$config = [
    'host'       => 'ms7.guzel.net.tr',
    'port'       => 465,
    'username'   => 'info@quartz.com.tr',
    'password'   => 'JSU*BEC74yDrEN',
    'encryption' => PHPMailer::ENCRYPTION_SMTPS,
    'from_email' => 'info@quartz.com.tr',
    'from_name'  => 'Quartz Clinique'
];

$result = null;
$error  = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $to      = isset($_POST['to']) ? trim($_POST['to']) : ';
    $subject = isset($_POST['subject']) ? trim($_POST['subject']) : ';
    $message = isset($_POST['message']) ? trim($_POST['message']) : ';

    if ($to === ' || $subject === ' || $message === ') {
        $error = 'Please fill in all fields before sending.';
    } elseif (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $error = 'The recipient email address is not valid.';
    } else {
        $mailer = new PHPMailer(true);

        try {
            $mailer->isSMTP();
            $mailer->Host       = $config['host'];
            $mailer->Port       = $config['port'];
            $mailer->SMTPAuth   = true;
            $mailer->Username   = $config['username'];
            $mailer->Password   = $config['password'];
            $mailer->SMTPSecure = $config['encryption'];
            $mailer->CharSet    = 'UTF-8';

            $mailer->setFrom($config['from_email'], $config['from_name']);
            $mailer->addAddress($to);

            $mailer->Subject = $subject;
            $mailer->Body    = $message;
            $mailer->AltBody = strip_tags($message);

            $mailer->send();
            $result = 'Test email sent successfully to ' . htmlspecialchars($to, ENT_QUOTES, 'UTF-8') . '.';
        } catch (Exception $mailException) {
            $error = 'Mailer Error: ' . $mailer->ErrorInfo;
        }
    }
}

function esc($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PHPMailer SMTP Test</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f7fa; margin: 0; padding: 2rem; }
        .wrap { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 12px 24px rgba(15,23,42,0.08); padding: 2rem; }
        h1 { margin-top: 0; font-size: 1.6rem; color: #0f172a; }
        .notice { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
        .notice.info { background: rgba(16,185,129,0.12); color: #047857; }
        .notice.error { background: rgba(239,68,68,0.12); color: #b91c1c; }
        label { display: block; margin-bottom: 0.3rem; font-weight: 600; color: #1f2937; }
        input, textarea { width: 100%; padding: 0.7rem 0.8rem; border: 1px solid #cbd5f5; border-radius: 8px; margin-bottom: 1.2rem; font-size: 0.95rem; }
        textarea { min-height: 140px; resize: vertical; }
        button { background: #0ea5e9; color: #fff; border: none; padding: 0.9rem 1.6rem; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background 0.2s ease; }
        button:hover { background: #0284c7; }
        .tip { font-size: 0.85rem; color: #475569; margin-bottom: 1.5rem; line-height: 1.5; }
        code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; }
    </style>
</head>
<body>
<div class="wrap">
    <h1>PHPMailer SMTP Test</h1>
    <p class="tip">Formu doldurun ve <code>ms7.guzel.net.tr</code> SMTP ayarlar� ile test mesaj� g�nderin. Hata olursa a�a��da g�r�nt�lenir.</p>

    <?php if ($result): ?>
        <div class="notice info"><?php echo esc($result); ?></div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="notice error"><?php echo esc($error); ?></div>
    <?php endif; ?>

    <form method="post">
        <label for="to">Recipient email</label>
        <input type="email" name="to" id="to" value="<?php echo esc(isset($_POST['to']) ? $_POST['to'] : '); ?>" required>

        <label for="subject">Subject</label>
        <input type="text" name="subject" id="subject" value="<?php echo esc(isset($_POST['subject']) ? $_POST['subject'] : 'PHPMailer Test Message'); ?>" required>

        <label for="message">Message</label>
        <textarea name="message" id="message" required><?php echo esc(isset($_POST['message']) ? $_POST['message'] : "Hello,\n\nThis is a PHPMailer SMTP connectivity test."); ?></textarea>

        <button type="submit">Send Test Email</button>
    </form>
</div>
</body>
</html>
