<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: SAMEORIGIN');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
  header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && (
  preg_match('#^https?://localhost(:\d+)?$#i', $origin) ||
  preg_match('#^https?://127\.0\.0\.1(:\d+)?$#i', $origin) ||
  in_array($origin, ['capacitor://localhost', 'ionic://localhost', 'https://ebdtotal.com', 'http://ebdtotal.com'], true)
)) {
  header("Access-Control-Allow-Origin: $origin");
  header('Access-Control-Allow-Headers: Authorization, Content-Type');
  header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
  header('Access-Control-Max-Age: 86400');
  header('Vary: Origin');
}
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function json_ok($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function json_err(string $msg, int $code = 400): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

function body(): array {
  $raw = file_get_contents('php://input') ?: '';
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function bearer(): ?string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
  return $_GET['token'] ?? $_POST['token'] ?? null;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  try {
    $cfg = require __DIR__ . '/config.php';
    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir)) mkdir($dataDir, 0750, true);

    if (($cfg['driver'] ?? 'sqlite') === 'mysql' && !empty($cfg['mysql']['pass'])) {
      $m = $cfg['mysql'];
      $dsn = "mysql:host={$m['host']};dbname={$m['name']};charset=utf8mb4";
      $pdo = new PDO($dsn, $m['user'], $m['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      ]);
    } else {
      $file = $dataDir . '/ebd.sqlite';
      $pdo = new PDO('sqlite:' . $file, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      ]);
      $pdo->exec('PRAGMA journal_mode=WAL');
      $pdo->exec('PRAGMA foreign_keys=ON');
    }
    migrate($pdo);
    return $pdo;
  } catch (Throwable $e) {
    json_err('Banco indisponível. Verifique a pasta api/data no servidor.', 500);
  }
}

function migrate(PDO $pdo): void {
  $pdo->exec("CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cidade TEXT DEFAULT '',
    responsavel TEXT DEFAULT '',
    email TEXT DEFAULT '',
    telefone TEXT DEFAULT '',
    status TEXT DEFAULT 'trial',
    username_admin TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )");
  $pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    papel TEXT NOT NULL,
    escola_id TEXT DEFAULT '',
    pessoa_id TEXT DEFAULT '',
    turma TEXT DEFAULT ''
  )");
  $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )");
  $pdo->exec("CREATE TABLE IF NOT EXISTS app_state (
    tenant_id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )");
  $pdo->exec("CREATE TABLE IF NOT EXISTS pessoas_idx (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT DEFAULT '',
    status TEXT DEFAULT 'Ativo',
    escola TEXT DEFAULT '',
    turma TEXT DEFAULT '',
    email TEXT DEFAULT '',
    PRIMARY KEY (tenant_id, id)
  )");
  $pdo->exec("CREATE TABLE IF NOT EXISTS escolas (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    setor TEXT DEFAULT '',
    bairro TEXT DEFAULT '',
    regional TEXT DEFAULT '',
    responsavel TEXT DEFAULT '',
    status TEXT DEFAULT 'Ativa',
    ativos INTEGER DEFAULT 0,
    inativos INTEGER DEFAULT 0,
    PRIMARY KEY (tenant_id, id)
  )");
  $pdo->exec("CREATE TABLE IF NOT EXISTS turmas (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    escola_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    faixa TEXT DEFAULT '',
    PRIMARY KEY (tenant_id, id)
  )");
  ensure_column($pdo, 'users', 'email', 'email TEXT DEFAULT \'\'');
  ensure_column($pdo, 'pessoas_idx', 'email', 'email TEXT DEFAULT \'\'');

  $st = $pdo->prepare('SELECT id FROM users WHERE username = ?');
  $st->execute(['itano']);
  if (!$st->fetch()) {
    $tid = 'master';
    $now = gmdate('c');
    $pdo->prepare('INSERT INTO tenants (id,nome,cidade,responsavel,status,username_admin,created_at) VALUES (?,?,?,?,?,?,?)')
      ->execute([$tid, 'EDB Total', '', 'Itano', 'ativa', 'itano', $now]);
    $pdo->prepare('INSERT INTO users (id,tenant_id,nome,username,senha_hash,papel) VALUES (?,?,?,?,?,?)')
      ->execute(['u-master', $tid, 'Itano', 'itano', password_hash('Itano1809@', PASSWORD_DEFAULT), 'admin']);
  }
}

function auth(): array {
  $token = bearer();
  if (!$token) json_err('Sessão expirada. Entre novamente.', 401);
  $pdo = db();
  $st = $pdo->prepare('SELECT s.token, s.user_id, s.tenant_id, s.expires_at, u.nome, u.username, u.papel, u.escola_id, u.pessoa_id, u.turma
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?');
  $st->execute([$token]);
  $row = $st->fetch();
  if (!$row || (int)$row['expires_at'] < time()) json_err('Sessão expirada. Entre novamente.', 401);
  return $row;
}

function uid(string $p = 'id'): string {
  return $p . '_' . bin2hex(random_bytes(6));
}

function colunas(PDO $pdo, string $table): array {
  $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
  if ($driver === 'mysql') {
    $rows = $pdo->query('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '`')->fetchAll();
    return array_map(static fn($r) => (string)$r['Field'], $rows);
  }
  $rows = $pdo->query('PRAGMA table_info(' . $table . ')')->fetchAll();
  return array_map(static fn($r) => (string)$r['name'], $rows);
}

function ensure_column(PDO $pdo, string $table, string $col, string $ddl): void {
  if (in_array($col, colunas($pdo, $table), true)) return;
  $pdo->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $ddl);
}

function email_valido(string $email): bool {
  return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

function cfg(): array {
  static $cfg = null;
  if ($cfg === null) $cfg = require __DIR__ . '/config.php';
  return $cfg;
}

function enviar_email(string $para, string $assunto, string $texto): bool {
  if (!email_valido($para)) return false;
  $mail = cfg()['mail'] ?? [];
  $from = (string)($mail['from'] ?? 'nao-responda@ebdtotal.com');
  $fromName = (string)($mail['from_name'] ?? 'EDB Total');
  $reply = (string)($mail['reply'] ?? $from);
  $encoded = '=?UTF-8?B?' . base64_encode($assunto) . '?=';
  $headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . sprintf('%s <%s>', $fromName, $from),
    'Reply-To: ' . $reply,
    'X-Mailer: EDB Total',
  ];
  return @mail($para, $encoded, $texto, implode("\r\n", $headers), '-f ' . $from);
}

function email_acesso(string $nome, string $igreja, string $username, string $senha): string {
  return "Olá, {$nome}.\n\n"
    . "Seu acesso ao EDB Total da igreja {$igreja} está pronto.\n\n"
    . "Site: https://ebdtotal.com/login\n"
    . "Usuário: {$username}\n"
    . "Senha: {$senha}\n\n"
    . "Guarde estes dados. Depois de entrar, você pode alterar a senha em Minha conta.\n\n"
    . "EDB Total\n";
}

function email_senha_provisoria(string $nome, string $username, string $senha): string {
  return "Olá, {$nome}.\n\n"
    . "Recebemos um pedido de nova senha para o usuário {$username}.\n\n"
    . "Senha provisória: {$senha}\n\n"
    . "Entre em https://ebdtotal.com/login e altere esta senha em Minha conta.\n"
    . "Se você não pediu isso, fale com a sede da sua igreja.\n\n"
    . "EDB Total\n";
}

function email_do_usuario(PDO $pdo, array $user): string {
  $email = strtolower(trim((string)($user['email'] ?? '')));
  if (email_valido($email)) return $email;
  $st = $pdo->prepare('SELECT email FROM tenants WHERE id = ?');
  $st->execute([(string)$user['tenant_id']]);
  $ten = $st->fetch();
  $email = strtolower(trim((string)($ten['email'] ?? '')));
  if (email_valido($email) && in_array($user['papel'], ['sede', 'admin'], true)) return $email;
  $pessoaId = (string)($user['pessoa_id'] ?? '');
  if ($pessoaId !== '') {
    $p = $pdo->prepare('SELECT email FROM pessoas_idx WHERE tenant_id = ? AND id = ?');
    $p->execute([(string)$user['tenant_id'], $pessoaId]);
    $row = $p->fetch();
    $email = strtolower(trim((string)($row['email'] ?? '')));
    if (email_valido($email)) return $email;
  }
  return '';
}

function gravar_senha_usuario(PDO $pdo, array $user, string $senha): void {
  $pdo->prepare('UPDATE users SET senha_hash = ? WHERE id = ?')
    ->execute([password_hash($senha, PASSWORD_DEFAULT), $user['id']]);
  $st = $pdo->prepare('SELECT json FROM app_state WHERE tenant_id = ?');
  $st->execute([(string)$user['tenant_id']]);
  $row = $st->fetch();
  if (!$row) return;
  $state = json_decode((string)$row['json'], true);
  if (!is_array($state)) return;
  foreach ($state['usuarios'] ?? [] as $i => $u) {
    $mesmoId = (string)($u['id'] ?? '') === (string)$user['id'];
    $mesmoUser = strtolower((string)($u['username'] ?? '')) === strtolower((string)$user['username']);
    if ($mesmoId || $mesmoUser) $state['usuarios'][$i]['senha'] = $senha;
  }
  $pdo->prepare('UPDATE app_state SET json = ?, updated_at = ? WHERE tenant_id = ?')
    ->execute([json_encode($state, JSON_UNESCAPED_UNICODE), gmdate('c'), $user['tenant_id']]);
}

function slug_user(string $nome): string {
  $s = iconv('UTF-8', 'ASCII//TRANSLIT', $nome) ?: $nome;
  $s = strtolower(preg_replace('/[^a-z0-9]+/i', '.', $s) ?? '');
  $s = trim($s, '.');
  return $s !== '' ? substr($s, 0, 24) : 'igreja';
}

function senha_forte(): string {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  $out = '';
  for ($i = 0; $i < 10; $i++) $out .= $chars[random_int(0, strlen($chars) - 1)];
  return $out;
}

function papel_do_tipo(string $tipo): ?string {
  if ($tipo === 'Professor') return 'professor';
  if ($tipo === 'Aluno') return 'aluno';
  if ($tipo === 'Superintendente') return 'superintendente';
  if ($tipo === 'Secretário') return 'secretario';
  return null;
}

function reconciliar_acessos(array $state): array {
  $pessoasById = [];
  foreach ($state['pessoas'] ?? [] as $p) {
    if (!empty($p['id'])) $pessoasById[(string)$p['id']] = $p;
  }
  $escolhidos = [];
  $out = [];
  foreach ($state['usuarios'] ?? [] as $u) {
    $pid = (string)($u['pessoaId'] ?? '');
    if ($pid === '' || !isset($pessoasById[$pid])) {
      $out[] = $u;
      continue;
    }
    if (isset($escolhidos[$pid])) continue;
    $p = $pessoasById[$pid];
    $papel = papel_do_tipo((string)($p['tipo'] ?? ''));
    if ($papel) $u['papel'] = $papel;
    $u['nome'] = $p['nome'] ?? ($u['nome'] ?? '');
    $u['escolaId'] = $p['escolaId'] ?? ($u['escolaId'] ?? '');
    $u['turma'] = $p['turma'] ?? ($u['turma'] ?? '');
    $escolhidos[$pid] = true;
    $out[] = $u;
  }
  $state['usuarios'] = $out;
  return $state;
}

function alinhar_papel_login(PDO $pdo, array $user): array {
  $st = $pdo->prepare('SELECT json FROM app_state WHERE tenant_id = ?');
  $st->execute([(string)$user['tenant_id']]);
  $row = $st->fetch();
  if (!$row) return $user;
  $state = json_decode((string)$row['json'], true);
  if (!is_array($state)) return $user;
  $antes = json_encode($state, JSON_UNESCAPED_UNICODE);
  $state = reconciliar_acessos($state);
  $pessoaId = (string)($user['pessoa_id'] ?? '');
  if ($pessoaId !== '') {
    foreach ($state['pessoas'] ?? [] as $p) {
      if ((string)($p['id'] ?? '') !== $pessoaId) continue;
      $papel = papel_do_tipo((string)($p['tipo'] ?? ''));
      if ($papel) {
        $user['papel'] = $papel;
        $user['escola_id'] = (string)($p['escolaId'] ?? $user['escola_id'] ?? '');
        $user['turma'] = (string)($p['turma'] ?? $user['turma'] ?? '');
        $pdo->prepare('UPDATE users SET papel = ?, escola_id = ?, turma = ? WHERE id = ?')
          ->execute([$papel, $user['escola_id'], $user['turma'], $user['id']]);
        foreach ($state['usuarios'] ?? [] as $i => $u) {
          if ((string)($u['id'] ?? '') === (string)$user['id'] || (string)($u['pessoaId'] ?? '') === $pessoaId) {
            $state['usuarios'][$i]['papel'] = $papel;
            $state['usuarios'][$i]['escolaId'] = $user['escola_id'];
            $state['usuarios'][$i]['turma'] = $user['turma'];
          }
        }
      }
      break;
    }
  }
  $depois = json_encode($state, JSON_UNESCAPED_UNICODE);
  if ($depois !== $antes) {
    $pdo->prepare('UPDATE app_state SET json = ?, updated_at = ? WHERE tenant_id = ?')
      ->execute([$depois, gmdate('c'), $user['tenant_id']]);
    sync_users($pdo, (string)$user['tenant_id'], $state);
  }
  $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
  $st->execute([$user['id']]);
  $fresh = $st->fetch();
  return $fresh ?: $user;
}

function indexar_pessoas(PDO $pdo, string $tenantId, array $state): void {
  $pdo->prepare('DELETE FROM pessoas_idx WHERE tenant_id = ?')->execute([$tenantId]);
  $escolas = [];
  foreach ($state['escolas'] ?? [] as $e) $escolas[$e['id'] ?? ''] = $e['nome'] ?? '';
  $ins = $pdo->prepare('INSERT INTO pessoas_idx (id,tenant_id,nome,tipo,status,escola,turma,email) VALUES (?,?,?,?,?,?,?,?)');
  foreach ($state['pessoas'] ?? [] as $p) {
    $ins->execute([
      $p['id'] ?? uid('p'),
      $tenantId,
      $p['nome'] ?? '',
      $p['tipo'] ?? '',
      $p['status'] ?? 'Ativo',
      $escolas[$p['escolaId'] ?? ''] ?? '',
      $p['turma'] ?? '',
      strtolower(trim((string)($p['email'] ?? ''))),
    ]);
  }
}

function sync_cadastros(PDO $pdo, string $tenantId, array $state): void {
  $pdo->prepare('DELETE FROM escolas WHERE tenant_id = ?')->execute([$tenantId]);
  $insE = $pdo->prepare('INSERT INTO escolas (id,tenant_id,nome,setor,bairro,regional,responsavel,status,ativos,inativos) VALUES (?,?,?,?,?,?,?,?,?,?)');
  foreach ($state['escolas'] ?? [] as $e) {
    $insE->execute([
      $e['id'] ?? uid('e'),
      $tenantId,
      $e['nome'] ?? '',
      $e['setor'] ?? '',
      $e['bairro'] ?? '',
      $e['regional'] ?? '',
      $e['responsavel'] ?? '',
      $e['status'] ?? 'Ativa',
      (int)($e['ativos'] ?? 0),
      (int)($e['inativos'] ?? 0),
    ]);
  }
  $pdo->prepare('DELETE FROM turmas WHERE tenant_id = ?')->execute([$tenantId]);
  $insT = $pdo->prepare('INSERT INTO turmas (id,tenant_id,escola_id,nome,faixa) VALUES (?,?,?,?,?)');
  foreach ($state['turmas'] ?? [] as $t) {
    $insT->execute([
      $t['id'] ?? uid('t'),
      $tenantId,
      $t['escolaId'] ?? '',
      $t['nome'] ?? '',
      $t['faixaEtaria'] ?? '',
    ]);
  }
}

function sync_users(PDO $pdo, string $tenantId, array $state): void {
  $emailsPessoa = [];
  foreach ($state['pessoas'] ?? [] as $p) {
    if (!empty($p['id'])) $emailsPessoa[(string)$p['id']] = strtolower(trim((string)($p['email'] ?? '')));
  }
  foreach ($state['usuarios'] ?? [] as $u) {
    $username = strtolower(trim((string)($u['username'] ?? '')));
    if ($username === '') continue;
    $id = $u['id'] ?? uid('u');
    $senha = (string)($u['senha'] ?? '');
    $email = strtolower(trim((string)($u['email'] ?? '')));
    if ($email === '' && !empty($u['pessoaId'])) $email = $emailsPessoa[(string)$u['pessoaId']] ?? '';
    $exist = $pdo->prepare('SELECT id, senha_hash FROM users WHERE username = ?');
    $exist->execute([$username]);
    $row = $exist->fetch();
    if ($row) {
      $hash = $row['senha_hash'];
      if ($senha !== '' && !password_verify($senha, $hash)) {
        $hash = password_hash($senha, PASSWORD_DEFAULT);
      }
      $pdo->prepare('UPDATE users SET tenant_id=?, nome=?, senha_hash=?, papel=?, escola_id=?, pessoa_id=?, turma=?, email=? WHERE username=?')
        ->execute([
          $tenantId,
          $u['nome'] ?? $username,
          $hash,
          $u['papel'] ?? 'superintendente',
          $u['escolaId'] ?? '',
          $u['pessoaId'] ?? '',
          $u['turma'] ?? '',
          $email,
          $username,
        ]);
    } else {
      if ($senha === '') $senha = senha_forte();
      $pdo->prepare('INSERT INTO users (id,tenant_id,nome,username,senha_hash,papel,escola_id,pessoa_id,turma,email) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute([
          $id,
          $tenantId,
          $u['nome'] ?? $username,
          $username,
          password_hash($senha, PASSWORD_DEFAULT),
          $u['papel'] ?? 'superintendente',
          $u['escolaId'] ?? '',
          $u['pessoaId'] ?? '',
          $u['turma'] ?? '',
          $email,
        ]);
    }
  }
  $keepIds = [];
  foreach ($state['usuarios'] ?? [] as $u) {
    if (!empty($u['id'])) $keepIds[] = (string)$u['id'];
  }
  $keepIds = array_values(array_unique($keepIds));
  if ($keepIds) {
    $ph = implode(',', array_fill(0, count($keepIds), '?'));
    $sql = "DELETE FROM users WHERE tenant_id = ? AND papel NOT IN ('admin','sede') AND COALESCE(pessoa_id,'') != '' AND id NOT IN ($ph)";
    $pdo->prepare($sql)->execute(array_merge([$tenantId], $keepIds));
  }
}
