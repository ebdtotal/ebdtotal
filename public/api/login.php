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
if (!$user || !password_verify($senha, $user['senha_hash'])) {
  json_err('Usuário ou senha inválidos.', 401);
}

$user = alinhar_papel_login($pdo, $user);

$ten = $pdo->prepare('SELECT status FROM tenants WHERE id = ?');
$ten->execute([$user['tenant_id']]);
$t = $ten->fetch();
if ($t && $t['status'] === 'suspensa' && $user['papel'] !== 'admin') {
  json_err('Assinatura suspensa. Fale com o suporte.', 403);
}

$token = bin2hex(random_bytes(24));
$pdo->prepare('INSERT INTO sessions (token,user_id,tenant_id,expires_at) VALUES (?,?,?,?)')
  ->execute([$token, $user['id'], $user['tenant_id'], time() + 60 * 60 * 24 * 14]);

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
