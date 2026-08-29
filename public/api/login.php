<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_err('Método inválido', 405);

$in = body();
$username = strtolower(trim((string)($in['username'] ?? '')));
$senha = (string)($in['senha'] ?? '');
if ($username === '' || $senha === '') json_err('Informe usuário e senha.');

$pdo = db();
$st = $pdo->prepare('SELECT * FROM users WHERE username = ?');
$st->execute([$username]);
$user = $st->fetch();
if (!$user && strpos($username, '@') !== false) {
  $st = $pdo->prepare('SELECT * FROM users WHERE email = ?');
  $st->execute([$username]);
  $user = $st->fetch();
}
if (!$user) {
  foreach (['.aluno', '.prof', '.super', '.sec'] as $suf) {
    $len = strlen($suf);
    if (substr($username, -$len) === $suf) continue;
    $st = $pdo->prepare('SELECT * FROM users WHERE username = ?');
    $st->execute([$username . $suf]);
    $user = $st->fetch();
    if ($user) break;
  }
}
if (!$user || !password_verify($senha, $user['senha_hash'])) {
  json_err('Usuário ou senha inválidos.', 401);
}

$token = bin2hex(random_bytes(24));
$pdo->prepare('INSERT INTO sessions (token,user_id,tenant_id,expires_at) VALUES (?,?,?,?)')
  ->execute([$token, $user['id'], $user['tenant_id'], time() + 60 * 60 * 24 * 14]);

registrar_atividade($pdo, (string)$user['tenant_id'], autor_de($user), 'entrou', 'Login no sistema');

json_ok([
  'token' => $token,
  'usuario' => [
    'id' => $user['id'],
    'nome' => $user['nome'],
    'username' => $user['username'],
    'papel' => $user['papel'],
    'escolaId' => $user['escola_id'] ?: null,
    'pessoaId' => $user['pessoa_id'] ?: null,
    'turma' => $user['turma'] ?: null,
    'tenantId' => $user['tenant_id'],
  ],
]);
