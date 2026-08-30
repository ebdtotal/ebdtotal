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
  $pdo->exec("CREATE TABLE IF NOT EXISTS atividades (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT DEFAULT '',
    username TEXT DEFAULT '',
    nome TEXT DEFAULT '',
    papel TEXT DEFAULT '',
    acao TEXT NOT NULL,
    detalhe TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )");
  try {
    $pdo->exec('CREATE INDEX idx_atividades_tenant_created ON atividades (tenant_id, created_at)');
  } catch (Throwable $e) {
    /* índice já existe */
  }
  try {
    $pdo->exec('CREATE INDEX idx_atividades_user ON atividades (user_id, created_at)');
  } catch (Throwable $e) {
    /* índice já existe */
  }
  $pdo->exec("CREATE TABLE IF NOT EXISTS signups (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cidade TEXT DEFAULT '',
    responsavel TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT DEFAULT '',
    status TEXT DEFAULT 'pendente',
    mp_preference_id TEXT DEFAULT '',
    mp_payment_id TEXT DEFAULT '',
    tenant_id TEXT DEFAULT '',
    username TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    pago_em TEXT DEFAULT ''
  )");
  ensure_column($pdo, 'signups', 'plano', "plano TEXT DEFAULT 'avista'");
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
  garantir_igreja_revisao($pdo);
}

function garantir_igreja_revisao(PDO $pdo): void {
  $st = $pdo->prepare('SELECT id FROM users WHERE username = ?');
  $st->execute(['apple.review']);
  if ($st->fetch()) return;
  $tid = 'igreja-revisao-apple';
  $uid = 'u-apple-review';
  $now = gmdate('c');
  $senha = 'ReviewEbd2026!';
  $pdo->prepare('INSERT INTO tenants (id,nome,cidade,responsavel,email,telefone,status,username_admin,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    ->execute([$tid, 'Igreja revisão App Store', 'São Luís', 'Revisão Apple', 'revisao@ebdtotal.com', '98981258852', 'ativa', 'apple.review', $now]);
  $pdo->prepare('INSERT INTO users (id,tenant_id,nome,username,senha_hash,papel,escola_id,email) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$uid, $tid, 'Revisão Apple', 'apple.review', password_hash($senha, PASSWORD_DEFAULT), 'sede', 'sede', 'revisao@ebdtotal.com']);
  $seed = [
    'escolas' => [[
      'id' => 'sede',
      'nome' => 'Igreja revisão App Store',
      'setor' => 'Sede',
      'bairro' => 'Centro',
      'regional' => 'Regional 35',
      'responsavel' => 'Revisão Apple',
      'username' => 'apple.review',
      'status' => 'Ativa',
      'ativos' => 4,
      'inativos' => 0,
    ]],
    'pessoas' => [
      ['id' => 'p-rev-1', 'nome' => 'Ana Souza', 'dataNascimento' => '2014-03-12', 'turma' => 'Primários', 'faixaEtaria' => 'Primários', 'tipo' => 'Aluno', 'sexo' => 'Feminino', 'status' => 'Ativo', 'escolaId' => 'sede'],
      ['id' => 'p-rev-2', 'nome' => 'Pedro Lima', 'dataNascimento' => '2013-07-02', 'turma' => 'Primários', 'faixaEtaria' => 'Primários', 'tipo' => 'Aluno', 'sexo' => 'Masculino', 'status' => 'Ativo', 'escolaId' => 'sede'],
      ['id' => 'p-rev-3', 'nome' => 'Maria Alves', 'dataNascimento' => '2015-01-20', 'turma' => 'Primários', 'faixaEtaria' => 'Primários', 'tipo' => 'Aluno', 'sexo' => 'Feminino', 'status' => 'Ativo', 'escolaId' => 'sede'],
      ['id' => 'p-rev-4', 'nome' => 'João Castro', 'dataNascimento' => '2014-11-08', 'turma' => 'Primários', 'faixaEtaria' => 'Primários', 'tipo' => 'Aluno', 'sexo' => 'Masculino', 'status' => 'Ativo', 'escolaId' => 'sede'],
    ],
    'turmas' => [['id' => 't-rev-1', 'nome' => 'Primários', 'escolaId' => 'sede', 'faixaEtaria' => 'Primários']],
    'usuarios' => [[
      'id' => $uid,
      'nome' => 'Revisão Apple',
      'username' => 'apple.review',
      'senha' => $senha,
      'papel' => 'sede',
      'escolaId' => 'sede',
      'email' => 'revisao@ebdtotal.com',
    ]],
    'setores' => [],
    'relatorios' => [],
    'lancamentos' => [],
    'categoriasFinanceiras' => [],
    'setoresEbd' => [],
    'revistas' => [],
    'licoes' => [],
    'eventos' => [],
    'avaliacoes' => [],
    'metas' => [['escolaId' => 'sede', 'frequencia' => 80, 'crescimento' => 10, 'visitantesMes' => 4, 'professoresCapacitados' => 2]],
    'avisos' => [['id' => 'av-rev-1', 'titulo' => 'Bem-vindos à EBD', 'texto' => 'Conta de demonstração para revisão da App Store.', 'data' => gmdate('Y-m-d')]],
    'desafios' => [],
    'certificados' => [],
    'licoesRemovidas' => [],
    'avaliacoesRemovidas' => [],
    'certificadosRemovidos' => [],
    'pessoasRemovidas' => [],
    'escolasRemovidas' => [],
    'turmasRemovidas' => [],
    'usuariosRemovidos' => [],
    'lancamentosRemovidos' => [],
    'avisosRemovidos' => [],
    'eventosRemovidos' => [],
    'setoresRemovidos' => [],
    'cursosRemovidos' => [],
    'categoriasRemovidas' => [],
    'setoresEbdRemovidos' => [],
    'revistasRemovidas' => [],
    'cursos' => [],
    'progressos' => [],
    'rankingCompetitivo' => true,
    'whatsapp' => '5598981258852',
    'sessaoId' => null,
  ];
  $pdo->prepare('INSERT INTO app_state (tenant_id, json, updated_at) VALUES (?,?,?)')
    ->execute([$tid, json_encode($seed, JSON_UNESCAPED_UNICODE), $now]);
  sync_cadastros($pdo, $tid, $seed);
}

function auth(): array {
  $token = bearer();
  if (!$token) json_err('Sessão expirada. Entre novamente.', 401);
  $pdo = db();
  $st = $pdo->prepare('SELECT s.token, s.user_id, s.tenant_id, s.expires_at, u.nome, u.username, u.papel, u.escola_id, u.pessoa_id, u.turma, t.status AS tenant_status
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN tenants t ON t.id = s.tenant_id
    WHERE s.token = ?');
  $st->execute([$token]);
  $row = $st->fetch();
  if (!$row || (int)$row['expires_at'] < time()) json_err('Sessão expirada. Entre novamente.', 401);
  if (($row['papel'] ?? '') !== 'admin' && (string)($row['tenant_status'] ?? '') === 'suspensa') {
    json_err('Acesso suspenso. Fale com o suporte da EDB Total.', 403);
  }
  return $row;
}

function uid(string $p = 'id'): string {
  return $p . '_' . bin2hex(random_bytes(6));
}

function ip_cliente(): string {
  $xff = (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
  if ($xff !== '') return trim(explode(',', $xff)[0]);
  return (string)($_SERVER['REMOTE_ADDR'] ?? '');
}

function autor_de(array $row): array {
  return [
    'id' => (string)($row['id'] ?? $row['user_id'] ?? ''),
    'username' => (string)($row['username'] ?? ''),
    'nome' => (string)($row['nome'] ?? ''),
    'papel' => (string)($row['papel'] ?? ''),
  ];
}

function registrar_atividade(PDO $pdo, string $tenantId, array $autor, string $acao, string $detalhe = ''): void {
  if ($tenantId === '' || $acao === '') return;
  try {
    $detalhe = trim($detalhe);
    if (strlen($detalhe) > 240) $detalhe = substr($detalhe, 0, 237) . '...';
    $pdo->prepare('INSERT INTO atividades (id,tenant_id,user_id,username,nome,papel,acao,detalhe,ip,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      ->execute([
        uid('at'),
        $tenantId,
        (string)($autor['id'] ?? $autor['user_id'] ?? ''),
        (string)($autor['username'] ?? ''),
        (string)($autor['nome'] ?? ''),
        (string)($autor['papel'] ?? ''),
        $acao,
        $detalhe,
        ip_cliente(),
        gmdate('c'),
      ]);
    static $limpeza = 0;
    $limpeza += 1;
    if ($limpeza === 1 || $limpeza % 30 === 0) {
      $pdo->prepare('DELETE FROM atividades WHERE created_at < ?')->execute([gmdate('c', time() - 90 * 86400)]);
    }
  } catch (Throwable $e) {
    /* o registro de atividades não pode impedir o login nem o save */
  }
}

function mapa_por_id(array $lista): array {
  $map = [];
  foreach ($lista as $item) {
    if (!is_array($item) || empty($item['id'])) continue;
    $map[(string)$item['id']] = $item;
  }
  return $map;
}

function nome_escola_state(array $state, string $id): string {
  foreach ($state['escolas'] ?? [] as $e) {
    if (!is_array($e)) continue;
    if ((string)($e['id'] ?? '') === $id) return (string)($e['nome'] ?? '');
  }
  return '';
}

function gravar_diff_estado(PDO $pdo, string $tenantId, array $sess, array $old, array $new): void {
  $autor = autor_de($sess);
  $n = 0;
  $limite = 40;
  $log = static function (string $acao, string $detalhe) use ($pdo, $tenantId, $autor, &$n, $limite): void {
    if ($n >= $limite) return;
    $n += 1;
    registrar_atividade($pdo, $tenantId, $autor, $acao, $detalhe);
  };

  $oldP = mapa_por_id($old['pessoas'] ?? []);
  $newP = mapa_por_id($new['pessoas'] ?? []);
  foreach ($newP as $id => $p) {
    $nome = (string)($p['nome'] ?? '');
    $tipo = (string)($p['tipo'] ?? '');
    if (!isset($oldP[$id])) {
      $log('cadastrou', trim($nome . ' · ' . $tipo, ' ·'));
      continue;
    }
    $o = $oldP[$id];
    $mud = [];
    foreach (['nome' => 'nome', 'tipo' => 'tipo', 'turma' => 'turma', 'status' => 'status'] as $k => $rot) {
      if ((string)($o[$k] ?? '') !== (string)($p[$k] ?? '')) $mud[] = $rot;
    }
    if ((string)($o['escolaId'] ?? '') !== (string)($p['escolaId'] ?? '')) $mud[] = 'congregação';
    if ($mud) $log('editou cadastro', trim($nome . ' · ' . implode(', ', $mud), ' ·'));
  }

  $oldU = mapa_por_id($old['usuarios'] ?? []);
  $newU = mapa_por_id($new['usuarios'] ?? []);
  foreach ($newU as $id => $u) {
    if (isset($oldU[$id])) {
      $antes = (string)($oldU[$id]['papel'] ?? '');
      $depois = (string)($u['papel'] ?? '');
      if ($antes !== '' && $depois !== '' && $antes !== $depois) {
        $log('alterou acesso', ($u['username'] ?? '') . ' · ' . $antes . ' → ' . $depois);
      }
      continue;
    }
    if (($u['pessoaId'] ?? '') === '') continue;
    $log('gerou acesso', trim(($u['username'] ?? '') . ' · ' . ($u['papel'] ?? '') . ' · ' . ($u['nome'] ?? ''), ' ·'));
  }

  $oldR = mapa_por_id($old['relatorios'] ?? []);
  $newR = mapa_por_id($new['relatorios'] ?? []);
  foreach ($newR as $id => $r) {
    $data = (string)($r['data'] ?? '');
    $escola = nome_escola_state($new, (string)($r['escolaId'] ?? ''));
    $rotulo = trim($escola . ($data !== '' ? ' · ' . $data : ''), ' ·');
    if (!isset($oldR[$id])) {
      $log('lançou relatório', $rotulo);
      continue;
    }
    $finAntigo = !empty($oldR[$id]['finalizado']);
    $finNovo = !empty($r['finalizado']);
    if (!$finAntigo && $finNovo) $log('finalizou relatório', $rotulo);
  }

  $oldL = mapa_por_id($old['lancamentos'] ?? []);
  $newL = mapa_por_id($new['lancamentos'] ?? []);
  foreach ($newL as $id => $l) {
    if (isset($oldL[$id])) continue;
    $log('lançou financeiro', trim(($l['tipo'] ?? '') . ' · ' . ($l['descricao'] ?? '') . ' · ' . ($l['valor'] ?? ''), ' ·'));
  }

  $oldA = mapa_por_id($old['avisos'] ?? []);
  $newA = mapa_por_id($new['avisos'] ?? []);
  foreach ($newA as $id => $a) {
    if (!isset($oldA[$id])) $log('publicou aviso', (string)($a['titulo'] ?? ''));
  }

  $oldAv = mapa_por_id($old['avaliacoes'] ?? []);
  $newAv = mapa_por_id($new['avaliacoes'] ?? []);
  foreach ($newAv as $id => $av) {
    $oldIds = [];
    foreach ($oldAv[$id]['respostas'] ?? [] as $resp) {
      if (is_array($resp) && isset($resp['pessoaId'])) $oldIds[(string)$resp['pessoaId']] = true;
    }
    foreach ($av['respostas'] ?? [] as $resp) {
      if (!is_array($resp) || empty($resp['pessoaId'])) continue;
      $pid = (string)$resp['pessoaId'];
      if (isset($oldIds[$pid])) continue;
      $nome = (string)($newP[$pid]['nome'] ?? $pid);
      $log('respondeu avaliação', $nome . (!empty($av['turma']) ? ' · ' . $av['turma'] : ''));
    }
  }
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
  if ($cfg === null) {
    $cfg = require __DIR__ . '/config.php';
    $local = __DIR__ . '/data/pagamento.local.php';
    if (is_file($local)) {
      $extra = require $local;
      if (is_array($extra)) {
        $cfg['pagamento'] = array_merge($cfg['pagamento'] ?? [], $extra);
      }
    }
  }
  return $cfg;
}

function enviar_email(string $para, string $assunto, string $texto): bool {
  if (!email_valido($para)) return false;
  $mail = cfg()['mail'] ?? [];
  $from = (string)($mail['from'] ?? 'naoresponda@ebdtotal.com');
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
    . "Guarde estes dados. Depois de entrar, você pode alterar a senha em Minha conta.\n"
    . "Esta mensagem é automática (naoresponda@ebdtotal.com). Não responda este e-mail.\n\n"
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

function site_url(): string {
  $cfg = rtrim((string)(cfg()['pagamento']['site_url'] ?? ''), '/');
  if ($cfg !== '') return $cfg;
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
  $host = (string)($_SERVER['HTTP_HOST'] ?? 'ebdtotal.com');
  return ($https ? 'https' : 'http') . '://' . $host;
}

function limite_pessoas_igreja(): int {
  $n = (int)(cfg()['limites']['pessoas'] ?? 600);
  return $n > 0 ? $n : 600;
}

function plano_assinatura(string $plano): array {
  $p = cfg()['pagamento'] ?? [];
  $avista = (float)($p['preco_avista'] ?? $p['preco'] ?? 1299);
  $parcelado = (float)($p['preco_parcelado'] ?? 1499);
  if ($avista <= 0) $avista = 1299;
  if ($parcelado <= 0) $parcelado = 1499;
  if ($plano === 'parcelado') {
    return [
      'id' => 'parcelado',
      'preco' => $parcelado,
      'parcelas' => 12,
      'titulo' => 'EDB Total — plano anual (até 12x)',
    ];
  }
  return [
    'id' => 'avista',
    'preco' => $avista,
    'parcelas' => 1,
    'titulo' => 'EDB Total — plano anual à vista',
  ];
}

function preco_assinatura(string $plano = 'avista'): float {
  return (float)plano_assinatura($plano)['preco'];
}

function http_json(string $method, string $url, array $headers, ?string $payload): array {
  $raw = '';
  $code = 0;
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    $opts = [
      CURLOPT_CUSTOMREQUEST => strtoupper($method),
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 25,
      CURLOPT_HTTPHEADER => $headers,
      CURLOPT_SSL_VERIFYPEER => true,
    ];
    if ($payload !== null) $opts[CURLOPT_POSTFIELDS] = $payload;
    curl_setopt_array($ch, $opts);
    $raw = (string)curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
  } else {
    $ctx = stream_context_create(['http' => [
      'method' => strtoupper($method),
      'header' => implode("\r\n", $headers),
      'content' => $payload ?? '',
      'timeout' => 25,
      'ignore_errors' => true,
    ]]);
    $raw = (string)@file_get_contents($url, false, $ctx);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
      $code = (int)$m[1];
    }
  }
  $data = json_decode($raw, true);
  if (!is_array($data)) $data = [];
  return ['ok' => $code >= 200 && $code < 300, 'code' => $code, 'data' => $data];
}

function mp_api(string $method, string $path, ?array $body = null): array {
  $token = trim((string)(cfg()['pagamento']['mp_access_token'] ?? ''));
  if ($token === '') return ['ok' => false, 'code' => 0, 'data' => ['message' => 'Mercado Pago não configurado.']];
  $payload = $body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE) : null;
  $headers = [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json',
    'Accept: application/json',
  ];
  return http_json($method, 'https://api.mercadopago.com' . $path, $headers, $payload);
}

function mp_criar_preferencia(string $sid, string $igreja, string $responsavel, string $email, array $plano, string $base): array {
  $parcelas = max(1, (int)($plano['parcelas'] ?? 1));
  $res = mp_api('POST', '/checkout/preferences', [
    'items' => [[
      'id' => 'ebd-' . (string)($plano['id'] ?? 'avista'),
      'title' => (string)($plano['titulo'] ?? 'EDB Total — plano anual'),
      'description' => 'Acesso da igreja ' . $igreja . ' (até 600 cadastros)',
      'quantity' => 1,
      'currency_id' => 'BRL',
      'unit_price' => round((float)$plano['preco'], 2),
    ]],
    'payer' => [
      'name' => $responsavel,
      'email' => $email,
    ],
    'back_urls' => [
      'success' => $base . '/assine/sucesso',
      'failure' => $base . '/assine/falha',
      'pending' => $base . '/assine/pendente',
    ],
    'auto_return' => 'approved',
    'external_reference' => $sid,
    'notification_url' => $base . '/api/pagamento.php',
    'statement_descriptor' => 'EDBTOTAL',
    'metadata' => [
      'signup_id' => $sid,
      'plano' => (string)($plano['id'] ?? 'avista'),
    ],
    'payment_methods' => [
      'installments' => $parcelas,
      'default_installments' => $parcelas,
    ],
  ]);
  if (!$res['ok']) {
    $msg = (string)($res['data']['message'] ?? $res['data']['error'] ?? 'Não foi possível abrir o pagamento.');
    json_err($msg, 502);
  }
  return $res['data'];
}

function criar_cliente(PDO $pdo, array $in, string $status = 'trial'): array {
  $nome = trim((string)($in['nome'] ?? ''));
  $responsavel = trim((string)($in['responsavel'] ?? ''));
  if ($nome === '' || $responsavel === '') json_err('Informe o nome da igreja e o responsável.');
  if (!in_array($status, ['trial', 'ativa'], true)) $status = 'trial';

  $base = slug_user($nome);
  $username = $base;
  $n = 1;
  $chk = $pdo->prepare('SELECT id FROM users WHERE username = ?');
  while (true) {
    $chk->execute([$username]);
    if (!$chk->fetch()) break;
    $n++;
    $username = $base . $n;
  }
  $senha = senha_forte();
  $tid = uid('igreja');
  $uid = uid('u');
  $now = gmdate('c');
  $cidade = trim((string)($in['cidade'] ?? ''));
  $email = strtolower(trim((string)($in['email'] ?? '')));
  $telefone = trim((string)($in['telefone'] ?? ''));
  if (!email_valido($email)) json_err('Informe um e-mail válido. Enviaremos o login e a senha para ele.');

  $pdo->prepare('INSERT INTO tenants (id,nome,cidade,responsavel,email,telefone,status,username_admin,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    ->execute([$tid, $nome, $cidade, $responsavel, $email, $telefone, $status, $username, $now]);
  $pdo->prepare('INSERT INTO users (id,tenant_id,nome,username,senha_hash,papel,email) VALUES (?,?,?,?,?,?,?)')
    ->execute([$uid, $tid, $responsavel, $username, password_hash($senha, PASSWORD_DEFAULT), 'sede', $email]);

  $seed = [
    'escolas' => [[
      'id' => 'sede',
      'nome' => $nome,
      'setor' => 'Sede',
      'bairro' => $cidade,
      'regional' => '',
      'responsavel' => $responsavel,
      'username' => $username,
      'status' => 'Ativa',
      'ativos' => 0,
      'inativos' => 0,
    ]],
    'pessoas' => [],
    'turmas' => [],
    'usuarios' => [[
      'id' => $uid,
      'nome' => $responsavel,
      'username' => $username,
      'senha' => $senha,
      'papel' => 'sede',
      'email' => $email,
    ]],
    'setores' => [],
    'relatorios' => [],
    'lancamentos' => [],
    'categoriasFinanceiras' => [],
    'setoresEbd' => [],
    'revistas' => [],
    'licoes' => [],
    'eventos' => [],
    'avaliacoes' => [],
    'metas' => [],
    'avisos' => [],
    'desafios' => [],
    'certificados' => [],
    'licoesRemovidas' => [],
    'avaliacoesRemovidas' => [],
    'certificadosRemovidos' => [],
    'pessoasRemovidas' => [],
    'escolasRemovidas' => [],
    'turmasRemovidas' => [],
    'usuariosRemovidos' => [],
    'lancamentosRemovidos' => [],
    'avisosRemovidos' => [],
    'eventosRemovidos' => [],
    'setoresRemovidos' => [],
    'cursosRemovidos' => [],
    'categoriasRemovidas' => [],
    'setoresEbdRemovidos' => [],
    'revistasRemovidas' => [],
    'cursos' => [],
    'progressos' => [],
    'rankingCompetitivo' => false,
    'whatsapp' => '',
    'sessaoId' => null,
  ];
  $pdo->prepare('INSERT INTO app_state (tenant_id, json, updated_at) VALUES (?,?,?)')
    ->execute([$tid, json_encode($seed, JSON_UNESCAPED_UNICODE), $now]);
  sync_cadastros($pdo, $tid, $seed);
  registrar_atividade($pdo, $tid, ['id' => $uid, 'username' => $username, 'nome' => $responsavel, 'papel' => 'sede'], 'criou igreja', $nome);

  $emailEnviado = enviar_email(
    $email,
    'Seu acesso ao EDB Total',
    email_acesso($responsavel, $nome, $username, $senha),
  );

  return [
    'igreja' => [
      'id' => $tid,
      'nome' => $nome,
      'status' => $status,
    ],
    'login' => [
      'username' => $username,
      'senha' => $senha,
      'nome' => $responsavel,
      'email' => $email,
    ],
    'emailEnviado' => $emailEnviado,
  ];
}

function iniciar_assinatura(PDO $pdo, array $in): array {
  $nome = trim((string)($in['nome'] ?? ''));
  $responsavel = trim((string)($in['responsavel'] ?? ''));
  $email = strtolower(trim((string)($in['email'] ?? '')));
  $cidade = trim((string)($in['cidade'] ?? ''));
  $telefone = trim((string)($in['telefone'] ?? ''));
  $planoId = ((string)($in['plano'] ?? '')) === 'parcelado' ? 'parcelado' : 'avista';
  $plano = plano_assinatura($planoId);
  if ($nome === '' || $responsavel === '') json_err('Informe o nome da igreja e o responsável.');
  if (!email_valido($email)) json_err('Informe um e-mail válido. Enviaremos o login e a senha para ele após o pagamento.');

  $st = $pdo->prepare("SELECT * FROM signups WHERE email = ? AND status = 'pendente' ORDER BY created_at DESC LIMIT 1");
  $st->execute([$email]);
  $exist = $st->fetch();
  $sid = $exist ? (string)$exist['id'] : uid('ass');
  $now = gmdate('c');
  if ($exist) {
    $pdo->prepare('UPDATE signups SET nome=?, cidade=?, responsavel=?, telefone=?, plano=? WHERE id=?')
      ->execute([$nome, $cidade, $responsavel, $telefone, $planoId, $sid]);
  } else {
    $pdo->prepare('INSERT INTO signups (id,nome,cidade,responsavel,email,telefone,status,plano,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      ->execute([$sid, $nome, $cidade, $responsavel, $email, $telefone, 'pendente', $planoId, $now]);
  }

  $token = trim((string)(cfg()['pagamento']['mp_access_token'] ?? ''));
  $link = trim((string)(cfg()['pagamento']['link_pagamento'] ?? ''));
  $preco = (float)$plano['preco'];
  $base = site_url();

  if ($token !== '') {
    $pref = mp_criar_preferencia($sid, $nome, $responsavel, $email, $plano, $base);
    $sandbox = strncmp($token, 'TEST-', 5) === 0;
    $url = $sandbox
      ? (string)($pref['sandbox_init_point'] ?? $pref['init_point'] ?? '')
      : (string)($pref['init_point'] ?? $pref['sandbox_init_point'] ?? '');
    if ($url === '') json_err('Não foi possível abrir o checkout. Tente novamente.');
    $pdo->prepare('UPDATE signups SET mp_preference_id = ? WHERE id = ?')->execute([(string)($pref['id'] ?? ''), $sid]);
    return ['checkoutUrl' => $url, 'signupId' => $sid, 'preco' => $preco, 'plano' => $planoId, 'email' => $email, 'igreja' => $nome];
  }

  if ($link !== '') {
    $sep = strpos($link, '?') === false ? '?' : '&';
    return [
      'checkoutUrl' => $link . $sep . 'sid=' . rawurlencode($sid) . '&plano=' . rawurlencode($planoId),
      'signupId' => $sid,
      'preco' => $preco,
      'plano' => $planoId,
      'email' => $email,
      'igreja' => $nome,
    ];
  }

  json_err('O pagamento online ainda está sendo configurado. Fale no WhatsApp (98) 98125-8852 — seu cadastro já foi recebido.', 503);
}

function status_signup_publico(PDO $pdo, string $sid): array {
  $st = $pdo->prepare('SELECT id,nome,email,status,pago_em FROM signups WHERE id = ?');
  $st->execute([$sid]);
  $row = $st->fetch();
  if (!$row) json_err('Assinatura não encontrada.', 404);
  return [
    'signupId' => $row['id'],
    'igreja' => $row['nome'],
    'email' => $row['email'],
    'status' => $row['status'],
    'pagoEm' => $row['pago_em'],
  ];
}

function ativar_signup_pago(PDO $pdo, string $signupId, string $paymentId): array {
  $st = $pdo->prepare('SELECT * FROM signups WHERE id = ?');
  $st->execute([$signupId]);
  $row = $st->fetch();
  if (!$row) json_err('Cadastro de assinatura não encontrado.', 404);
  if ((string)$row['status'] === 'pago' && (string)$row['tenant_id'] !== '') {
    return [
      'jaPago' => true,
      'igreja' => ['id' => $row['tenant_id'], 'nome' => $row['nome'], 'status' => 'ativa'],
      'login' => ['username' => (string)$row['username'], 'senha' => '', 'nome' => $row['responsavel'], 'email' => $row['email']],
      'emailEnviado' => true,
    ];
  }

  $criado = criar_cliente($pdo, [
    'nome' => $row['nome'],
    'cidade' => $row['cidade'],
    'responsavel' => $row['responsavel'],
    'email' => $row['email'],
    'telefone' => $row['telefone'],
  ], 'ativa');

  $pdo->prepare('UPDATE signups SET status=?, mp_payment_id=?, tenant_id=?, username=?, pago_em=? WHERE id=?')
    ->execute([
      'pago',
      $paymentId,
      $criado['igreja']['id'],
      $criado['login']['username'],
      gmdate('c'),
      $signupId,
    ]);
  return $criado;
}

function processar_pagamento_mp(PDO $pdo, string $paymentId): bool {
  $paymentId = trim($paymentId);
  if ($paymentId === '') return false;
  $res = mp_api('GET', '/v1/payments/' . rawurlencode($paymentId));
  if (!$res['ok']) return false;
  $pay = $res['data'];
  if ((string)($pay['status'] ?? '') !== 'approved') return false;
  $ref = (string)($pay['external_reference'] ?? '');
  if ($ref === '') $ref = (string)(($pay['metadata']['signup_id'] ?? ''));
  if ($ref === '') return false;
  $amount = (float)($pay['transaction_amount'] ?? 0);
  $stPlano = $pdo->prepare('SELECT plano FROM signups WHERE id = ?');
  $stPlano->execute([$ref]);
  $rowPlano = $stPlano->fetch();
  $planoId = ((string)($rowPlano['plano'] ?? '')) === 'parcelado' ? 'parcelado' : 'avista';
  if ($amount + 0.009 < preco_assinatura($planoId)) return false;
  ativar_signup_pago($pdo, $ref, $paymentId);
  return true;
}

function processar_notificacao_mp(PDO $pdo, string $topic, string $id): void {
  $topic = strtolower(trim($topic));
  $id = trim($id);
  if ($id === '') return;
  if ($topic === 'payment' || $topic === 'payment.updated' || $topic === 'payment.created') {
    processar_pagamento_mp($pdo, $id);
    return;
  }
  if ($topic === 'merchant_order' || $topic === 'merchant_orders' || strpos($topic, 'merchant_order') !== false) {
    $res = mp_api('GET', '/merchant_orders/' . rawurlencode($id));
    if (!$res['ok']) return;
    foreach (($res['data']['payments'] ?? []) as $p) {
      if (!is_array($p)) continue;
      if ((string)($p['status'] ?? '') === 'approved' && !empty($p['id'])) {
        processar_pagamento_mp($pdo, (string)$p['id']);
      }
    }
  }
}

function senha_e_hash(string $senha): bool {
  return strncmp($senha, '$2y$', 4) === 0
    || strncmp($senha, '$2a$', 4) === 0
    || strncmp($senha, '$2b$', 4) === 0;
}

function slug_login(string $nome): string {
  $s = iconv('UTF-8', 'ASCII//TRANSLIT', $nome) ?: $nome;
  $s = strtolower(preg_replace('/[^a-z0-9]+/i', '', $s) ?? '');
  $s = substr($s, 0, 14);
  return $s !== '' ? $s : 'user';
}

function papel_do_tipo(string $tipo): ?string {
  if ($tipo === 'Professor') return 'professor';
  if ($tipo === 'Aluno') return 'aluno';
  if ($tipo === 'Superintendente') return 'superintendente';
  if ($tipo === 'Secretário') return 'secretario';
  return null;
}

function stamp_missing_updated_at(array $state, string $ts): array {
  $campos = ['pessoas', 'escolas', 'turmas', 'usuarios', 'lancamentos', 'avaliacoes', 'avisos', 'certificados', 'eventos', 'licoes', 'setores', 'cursos', 'categoriasFinanceiras', 'setoresEbd', 'revistas'];
  foreach ($campos as $campo) {
    if (!isset($state[$campo]) || !is_array($state[$campo])) continue;
    foreach ($state[$campo] as $i => $item) {
      if (!is_array($item) || empty($item['id'])) continue;
      if (empty($item['updatedAt'])) $state[$campo][$i]['updatedAt'] = $ts;
    }
  }
  return $state;
}

function username_disponivel(PDO $pdo, string $username, string $exceptId): string {
  $username = strtolower(trim($username));
  if ($username === '') $username = 'user.' . bin2hex(random_bytes(3));
  $base = $username;
  $n = 1;
  while (true) {
    $st = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $st->execute([$username]);
    $row = $st->fetch();
    if (!$row || (string)$row['id'] === $exceptId) return $username;
    $n += 1;
    $username = $base . $n;
  }
}

function reconciliar_acessos(array $state): array {
  $pessoasById = [];
  foreach ($state['pessoas'] ?? [] as $p) {
    if (!empty($p['id'])) $pessoasById[(string)$p['id']] = $p;
  }
  $escolhidos = [];
  $out = [];
  $usernames = [];
  foreach ($state['usuarios'] ?? [] as $u) {
    $pid = (string)($u['pessoaId'] ?? '');
    $key = strtolower(trim((string)($u['username'] ?? '')));
    if ($key !== '') $usernames[$key] = true;
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
  $suf = ['professor' => 'prof', 'aluno' => 'aluno', 'superintendente' => 'super', 'secretario' => 'sec'];
  foreach ($pessoasById as $pid => $p) {
    if (isset($escolhidos[$pid])) continue;
    if (($p['status'] ?? 'Ativo') !== 'Ativo') continue;
    $papel = papel_do_tipo((string)($p['tipo'] ?? ''));
    if (!$papel) continue;
    $base = slug_login((string)($p['nome'] ?? '')) . '.' . ($suf[$papel] ?? 'user');
    $username = $base;
    $n = 1;
    while (isset($usernames[$username])) {
      $n += 1;
      $username = $base . $n;
    }
    $usernames[$username] = true;
    $out[] = [
      'id' => uid('u'),
      'nome' => $p['nome'] ?? $username,
      'username' => $username,
      'senha' => senha_forte(),
      'papel' => $papel,
      'escolaId' => $p['escolaId'] ?? '',
      'pessoaId' => $pid,
      'turma' => $p['turma'] ?? '',
      'email' => strtolower(trim((string)($p['email'] ?? ''))),
      'updatedAt' => gmdate('c'),
    ];
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

function mesclar_usuarios_banco(PDO $pdo, string $tenantId, array $state): array {
  $st = $pdo->prepare('SELECT id, nome, username, papel, escola_id, pessoa_id, turma, email FROM users WHERE tenant_id = ?');
  $st->execute([$tenantId]);
  $remU = array_flip(unir_ids($state['usuariosRemovidos'] ?? null, []));
  $remP = array_flip(unir_ids($state['pessoasRemovidas'] ?? null, []));
  $map = [];
  foreach ($state['usuarios'] ?? [] as $u) {
    $key = strtolower(trim((string)($u['username'] ?? '')));
    if ($key === '') continue;
    $map[$key] = $u;
  }
  foreach ($st->fetchAll() as $row) {
    $uidRow = (string)($row['id'] ?? '');
    $pid = (string)($row['pessoa_id'] ?? '');
    if ($uidRow !== '' && isset($remU[$uidRow])) continue;
    if ($pid !== '' && isset($remP[$pid])) continue;
    $key = strtolower(trim((string)$row['username']));
    if ($key === '') continue;
    $atual = $map[$key] ?? [];
    $map[$key] = [
      'id' => $atual['id'] ?? $row['id'],
      'nome' => $atual['nome'] ?? $row['nome'],
      'username' => $atual['username'] ?? $row['username'],
      'senha' => $atual['senha'] ?? '',
      'papel' => $atual['papel'] ?? ($row['papel'] ?: 'sede'),
      'escolaId' => ($atual['escolaId'] ?? '') !== '' ? $atual['escolaId'] : (($row['escola_id'] ?? '') !== '' ? $row['escola_id'] : null),
      'pessoaId' => ($atual['pessoaId'] ?? '') !== '' ? $atual['pessoaId'] : (($row['pessoa_id'] ?? '') !== '' ? $row['pessoa_id'] : null),
      'turma' => ($atual['turma'] ?? '') !== '' ? $atual['turma'] : (($row['turma'] ?? '') !== '' ? $row['turma'] : null),
      'email' => $atual['email'] ?? ($row['email'] ?: ''),
    ];
  }
  $state['usuarios'] = array_values($map);
  return $state;
}

function sync_users(PDO $pdo, string $tenantId, array &$state): void {
  $emailsPessoa = [];
  foreach ($state['pessoas'] ?? [] as $p) {
    if (!empty($p['id'])) $emailsPessoa[(string)$p['id']] = strtolower(trim((string)($p['email'] ?? '')));
  }
  foreach ($state['usuarios'] ?? [] as $i => $u) {
    $id = (string)($u['id'] ?? '');
    if ($id === '') {
      $id = uid('u');
      $state['usuarios'][$i]['id'] = $id;
    }
    $username = strtolower(trim((string)($u['username'] ?? '')));
    if ($username === '') continue;
    $senha = (string)($u['senha'] ?? '');
    $email = strtolower(trim((string)($u['email'] ?? '')));
    if ($email === '' && !empty($u['pessoaId'])) $email = $emailsPessoa[(string)$u['pessoaId']] ?? '';

    $st = $pdo->prepare('SELECT id, senha_hash, tenant_id, username FROM users WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if ($row && (string)$row['tenant_id'] !== $tenantId) {
      $row = null;
      $id = uid('u');
      $state['usuarios'][$i]['id'] = $id;
    }
    if (!$row) {
      $st = $pdo->prepare('SELECT id, senha_hash, tenant_id, username FROM users WHERE username = ?');
      $st->execute([$username]);
      $byName = $st->fetch();
      if ($byName && (string)$byName['tenant_id'] === $tenantId) {
        $row = $byName;
        $id = (string)$byName['id'];
        $state['usuarios'][$i]['id'] = $id;
      }
    }

    $exceptId = $row ? (string)$row['id'] : $id;
    $livre = username_disponivel($pdo, $username, $exceptId);
    if ($livre !== $username) {
      $username = $livre;
      $state['usuarios'][$i]['username'] = $username;
    }

    $hash = $row['senha_hash'] ?? null;
    if ($senha !== '' && !senha_e_hash($senha)) {
      if (!$hash || !password_verify($senha, $hash)) {
        $hash = password_hash($senha, PASSWORD_DEFAULT);
      }
    }
    if (!$hash) {
      if ($senha === '' || senha_e_hash($senha)) {
        $senha = senha_forte();
        $state['usuarios'][$i]['senha'] = $senha;
      }
      $hash = password_hash($senha, PASSWORD_DEFAULT);
    }

    $vals = [
      $tenantId,
      $u['nome'] ?? $username,
      $username,
      $hash,
      $u['papel'] ?? 'superintendente',
      $u['escolaId'] ?? '',
      $u['pessoaId'] ?? '',
      $u['turma'] ?? '',
      $email,
    ];
    if ($row) {
      $pdo->prepare('UPDATE users SET tenant_id=?, nome=?, username=?, senha_hash=?, papel=?, escola_id=?, pessoa_id=?, turma=?, email=? WHERE id=?')
        ->execute(array_merge($vals, [$row['id']]));
    } else {
      $pdo->prepare('INSERT INTO users (id,tenant_id,nome,username,senha_hash,papel,escola_id,pessoa_id,turma,email) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute(array_merge([$id], $vals));
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

function merge_by_id(array $old, array $new): array {
  $map = [];
  foreach ($old as $item) {
    if (!is_array($item) || empty($item['id'])) continue;
    $map[(string)$item['id']] = $item;
  }
  foreach ($new as $item) {
    if (!is_array($item) || empty($item['id'])) continue;
    $id = (string)$item['id'];
    if (!isset($map[$id])) {
      $map[$id] = $item;
      continue;
    }
    $ot = (string)($map[$id]['updatedAt'] ?? '');
    $nt = (string)($item['updatedAt'] ?? '');
    if ($nt !== '' && strcmp($nt, $ot) >= 0) $map[$id] = $item;
    elseif ($nt === '' && $ot === '') $map[$id] = $item;
  }
  return array_values($map);
}

function merge_relatorios(array $old, array $new): array {
  $map = [];
  $put = static function ($item) use (&$map): void {
    if (!is_array($item)) return;
    $escola = (string)($item['escolaId'] ?? '');
    $data = (string)($item['data'] ?? '');
    $k = ($escola !== '' && $data !== '') ? ($escola . '|' . $data) : ('id:' . (string)($item['id'] ?? ''));
    if ($k === 'id:') return;
    if (!isset($map[$k])) {
      $map[$k] = $item;
      return;
    }
    $ot = (string)($map[$k]['updatedAt'] ?? '');
    $nt = (string)($item['updatedAt'] ?? '');
    if ($nt === '') {
      if ($ot === '') $map[$k] = $item;
      return;
    }
    if ($ot === '' || strcmp($nt, $ot) >= 0) $map[$k] = $item;
  };
  foreach ($old as $item) $put($item);
  foreach ($new as $item) $put($item);
  return array_values($map);
}

function merge_state(array $old, array $new): array {
  $out = array_merge($old, $new);
  $listas = ['pessoas', 'escolas', 'turmas', 'usuarios', 'lancamentos', 'avaliacoes', 'avisos', 'certificados', 'eventos', 'licoes', 'setores', 'cursos', 'categoriasFinanceiras', 'setoresEbd', 'revistas'];
  foreach ($listas as $campo) {
    $out[$campo] = merge_by_id(
      is_array($old[$campo] ?? null) ? $old[$campo] : [],
      is_array($new[$campo] ?? null) ? $new[$campo] : []
    );
  }
  $out['relatorios'] = merge_relatorios(
    is_array($old['relatorios'] ?? null) ? $old['relatorios'] : [],
    is_array($new['relatorios'] ?? null) ? $new['relatorios'] : []
  );
  foreach (campos_tombstone() as $campo => $tumba) {
    $out[$tumba] = unir_ids($old[$tumba] ?? null, $new[$tumba] ?? null);
    $vivos = [];
    foreach (is_array($new[$campo] ?? null) ? $new[$campo] : [] as $item) {
      if (is_array($item) && !empty($item['id'])) $vivos[(string)$item['id']] = true;
    }
    if ($vivos) {
      $ids = [];
      foreach ($out[$tumba] as $id) {
        $id = (string)$id;
        if ($id === '' || isset($vivos[$id])) continue;
        $ids[] = $id;
      }
      $out[$tumba] = array_values(array_unique($ids));
    }
  }
  $removidas = array_flip($out['licoesRemovidas']);
  $licoes = [];
  foreach (is_array($out['licoes'] ?? null) ? $out['licoes'] : [] as $l) {
    if (!is_array($l) || empty($l['id'])) continue;
    if (isset($removidas[(string)$l['id']])) continue;
    $licoes[] = $l;
  }
  $antes = [];
  foreach ($licoes as $l) $antes[(string)$l['id']] = true;
  $out['licoes'] = deduplicar_licoes($licoes);
  foreach ($out['licoes'] as $l) unset($antes[(string)($l['id'] ?? '')]);
  $out['licoesRemovidas'] = array_values(array_unique(array_merge($out['licoesRemovidas'], array_keys($antes))));
  return aplicar_tombstones($out);
}

function unir_ids($a, $b): array {
  return array_values(array_unique(array_merge(
    is_array($a) ? $a : [],
    is_array($b) ? $b : []
  )));
}

function filtrar_removidos(array $lista, array $ids): array {
  $rem = array_flip($ids);
  $out = [];
  foreach ($lista as $item) {
    if (!is_array($item) || empty($item['id'])) continue;
    if (isset($rem[(string)$item['id']])) continue;
    $out[] = $item;
  }
  return $out;
}

function campos_tombstone(): array {
  return [
    'pessoas' => 'pessoasRemovidas',
    'escolas' => 'escolasRemovidas',
    'turmas' => 'turmasRemovidas',
    'usuarios' => 'usuariosRemovidos',
    'lancamentos' => 'lancamentosRemovidos',
    'avaliacoes' => 'avaliacoesRemovidas',
    'avisos' => 'avisosRemovidos',
    'certificados' => 'certificadosRemovidos',
    'eventos' => 'eventosRemovidos',
    'licoes' => 'licoesRemovidas',
    'setores' => 'setoresRemovidos',
    'cursos' => 'cursosRemovidos',
    'categoriasFinanceiras' => 'categoriasRemovidas',
    'setoresEbd' => 'setoresEbdRemovidos',
    'revistas' => 'revistasRemovidas',
  ];
}

function aplicar_tombstones(array $state): array {
  foreach (campos_tombstone() as $campo => $tumba) {
    $ids = unir_ids($state[$tumba] ?? null, []);
    $state[$tumba] = $ids;
    $state[$campo] = filtrar_removidos(is_array($state[$campo] ?? null) ? $state[$campo] : [], $ids);
  }
  $remP = array_flip($state['pessoasRemovidas'] ?? []);
  $usuarios = [];
  foreach (is_array($state['usuarios'] ?? null) ? $state['usuarios'] : [] as $u) {
    if (!is_array($u)) continue;
    $pid = (string)($u['pessoaId'] ?? '');
    if ($pid !== '' && isset($remP[$pid])) continue;
    $usuarios[] = $u;
  }
  $state['usuarios'] = $usuarios;
  return $state;
}

function chave_licao(array $l): string {
  $turma = trim((string)($l['turma'] ?? ''));
  $aula = ((string)($l['ano'] ?? '')) . '|' . ((string)($l['trimestre'] ?? '')) . '|' . ((string)($l['numero'] ?? ''));
  if ($turma === '') return 'g|' . $aula;
  return 't|' . $aula . '|' . strtolower($turma) . '|' . trim((string)($l['escolaId'] ?? ''));
}

function deduplicar_licoes(array $licoes): array {
  $grupos = [];
  foreach ($licoes as $l) {
    $grupos[chave_licao($l)][] = $l;
  }
  $keep = [];
  foreach ($grupos as $lista) {
    if (count($lista) === 1) {
      $keep[] = $lista[0];
      continue;
    }
    usort($lista, static function ($a, $b) {
      return strcmp((string)($b['updatedAt'] ?? ''), (string)($a['updatedAt'] ?? ''));
    });
    $keep[] = $lista[0];
  }
  return array_values($keep);
}
