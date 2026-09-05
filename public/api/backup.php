<?php
/**
 * Backup diário do banco (SQLite) — mantém os últimos 14 dias.
 *
 * Cron no cPanel (recomendado), todo dia às 03:10:
 *   /usr/bin/php /home1/jricon98/ebdtotal.com/api/backup.php >/dev/null 2>&1
 *
 * Ou via URL (defina o segredo em config ou EBD_BACKUP_SECRET):
 *   curl -fsS "https://ebdtotal.com/api/backup.php?key=SEU_SEGREDO" >/dev/null 2>&1
 */
declare(strict_types=1);

$cli = (PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg');
if (!$cli) {
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
}

function backup_out(array $data, int $code = 200): void {
  global $cli;
  if ($cli) {
    fwrite($code >= 400 ? STDERR : STDOUT, json_encode($data, JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit($code >= 400 ? 1 : 0);
  }
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

$cfg = require __DIR__ . '/config.php';
$local = __DIR__ . '/data/pagamento.local.php';
if (is_file($local)) {
  $extra = require $local;
  if (is_array($extra)) {
    if (isset($extra['backup_secret'])) {
      $cfg['backup']['secret'] = (string)$extra['backup_secret'];
    }
    if (isset($extra['backup_dias'])) {
      $cfg['backup']['dias'] = (int)$extra['backup_dias'];
    }
  }
}

$dias = max(1, (int)($cfg['backup']['dias'] ?? 14));
$secret = (string)($cfg['backup']['secret'] ?? '');

if (!$cli) {
  $key = (string)($_GET['key'] ?? $_POST['key'] ?? '');
  if ($secret === '' || !hash_equals($secret, $key)) {
    backup_out(['erro' => 'Não autorizado. Use o Cron via PHP CLI ou informe a chave correta.'], 401);
  }
}

$dataDir = __DIR__ . '/data';
$backupDir = $dataDir . '/backups';
if (!is_dir($dataDir)) {
  backup_out(['erro' => 'Pasta api/data não encontrada.'], 500);
}
if (!is_dir($backupDir) && !mkdir($backupDir, 0750, true)) {
  backup_out(['erro' => 'Não foi possível criar api/data/backups.'], 500);
}

$deny = $backupDir . '/.htaccess';
if (!is_file($deny)) {
  file_put_contents($deny, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
}

$hoje = gmdate('Y-m-d');
$dest = $backupDir . '/ebd-' . $hoje . '.sqlite';
$fonte = $dataDir . '/ebd.sqlite';
$driver = (string)($cfg['driver'] ?? 'sqlite');
$usouMysql = $driver === 'mysql' && !empty($cfg['mysql']['pass']);

try {
  if ($usouMysql) {
    $m = $cfg['mysql'];
    $dump = $backupDir . '/ebd-' . $hoje . '.sql';
    $mysqldump = trim((string)shell_exec('command -v mysqldump 2>/dev/null') ?: '');
    if ($mysqldump === '') {
      backup_out(['erro' => 'MySQL ativo, mas mysqldump não está disponível no servidor.'], 500);
    }
    $cmd = escapeshellarg($mysqldump)
      . ' --single-transaction --quick --skip-lock-tables'
      . ' -h ' . escapeshellarg((string)$m['host'])
      . ' -u ' . escapeshellarg((string)$m['user'])
      . ' -p' . escapeshellarg((string)$m['pass'])
      . ' ' . escapeshellarg((string)$m['name'])
      . ' > ' . escapeshellarg($dump)
      . ' 2>/dev/null';
    exec($cmd, $out, $code);
    if ($code !== 0 || !is_file($dump) || filesize($dump) < 32) {
      @unlink($dump);
      backup_out(['erro' => 'Falha ao gerar dump MySQL.'], 500);
    }
    $dest = $dump;
  } else {
    if (!is_file($fonte)) {
      backup_out(['erro' => 'Arquivo ebd.sqlite ainda não existe.'], 404);
    }
    $pdo = new PDO('sqlite:' . $fonte, null, null, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    try {
      $pdo->exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (Throwable $e) {
      /* ignore */
    }
    $okVacuum = false;
    try {
      if (is_file($dest)) @unlink($dest);
      $pdo->exec("VACUUM INTO " . $pdo->quote($dest));
      $okVacuum = is_file($dest) && filesize($dest) > 0;
    } catch (Throwable $e) {
      $okVacuum = false;
    }
    if (!$okVacuum) {
      if (!@copy($fonte, $dest)) {
        backup_out(['erro' => 'Falha ao copiar ebd.sqlite.'], 500);
      }
      @chmod($dest, 0640);
    }
  }
} catch (Throwable $e) {
  backup_out(['erro' => 'Backup falhou: ' . $e->getMessage()], 500);
}

$removidos = [];
$limite = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('-' . $dias . ' days');
$arquivos = array_merge(
  glob($backupDir . '/ebd-*.sqlite') ?: [],
  glob($backupDir . '/ebd-*.sql') ?: [],
);
foreach ($arquivos as $arquivo) {
  $base = basename($arquivo);
  if (!preg_match('/^ebd-(\d{4}-\d{2}-\d{2})\.(sqlite|sql)$/', $base, $m)) continue;
  try {
    $data = new DateTimeImmutable($m[1], new DateTimeZone('UTC'));
  } catch (Throwable $e) {
    continue;
  }
  if ($data < $limite) {
    if (@unlink($arquivo)) $removidos[] = $base;
  }
}

$lista = [];
$arquivos = array_merge(
  glob($backupDir . '/ebd-*.sqlite') ?: [],
  glob($backupDir . '/ebd-*.sql') ?: [],
);
foreach ($arquivos as $arquivo) {
  $lista[] = [
    'arquivo' => basename($arquivo),
    'bytes' => filesize($arquivo) ?: 0,
  ];
}
usort($lista, static fn($a, $b) => strcmp($b['arquivo'], $a['arquivo']));

backup_out([
  'ok' => true,
  'mensagem' => 'Backup diário concluído.',
  'arquivo' => basename($dest),
  'bytes' => filesize($dest) ?: 0,
  'retencao_dias' => $dias,
  'removidos' => $removidos,
  'backups' => $lista,
]);
