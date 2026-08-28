<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_err('Método inválido', 405);

$in = body();
$acao = (string)($in['acao'] ?? '');
$pdo = db();

if ($acao === 'esqueci') {
  $busca = strtolower(trim((string)($in['usuario'] ?? $in['email'] ?? '')));
  if ($busca === '') json_err('Informe o usuário ou o e-mail cadastrado.');

  $st = $pdo->prepare(
    "SELECT u.* FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE lower(u.username) = ?
        OR lower(u.email) = ?
        OR (u.papel IN ('sede','admin') AND lower(t.email) = ?)
     LIMIT 1"
  );
  $st->execute([$busca, $busca, $busca]);
  $user = $st->fetch();
  $msg = 'Se este cadastro existir e tiver e-mail, enviamos uma senha provisória.';
  if (!$user) json_ok(['ok' => true, 'mensagem' => $msg]);

  $email = email_do_usuario($pdo, $user);
  if ($email === '') {
    json_err('Este acesso não tem e-mail cadastrado. Peça à sede da igreja para redefinir a senha.');
  }
  $senha = senha_forte();
  gravar_senha_usuario($pdo, $user, $senha);
  $ok = enviar_email($email, 'Senha provisória — EDB Total', email_senha_provisoria((string)$user['nome'], (string)$user['username'], $senha));
  if (!$ok) json_err('Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.');
  json_ok(['ok' => true, 'mensagem' => 'Enviamos uma senha provisória para ' . $email . '.']);
}

if ($acao === 'alterar') {
  $sess = auth();
  $atual = (string)($in['senhaAtual'] ?? '');
  $nova = (string)($in['senhaNova'] ?? '');
  if (strlen($nova) < 6) json_err('A nova senha precisa ter pelo menos 6 caracteres.');
  $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
  $st->execute([$sess['user_id']]);
  $user = $st->fetch();
  if (!$user || !password_verify($atual, $user['senha_hash'])) {
    json_err('Senha atual incorreta.');
  }
  gravar_senha_usuario($pdo, $user, $nova);
  json_ok(['ok' => true]);
}

json_err('Ação inválida.');
