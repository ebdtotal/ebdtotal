<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$sess = auth();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];
$tid = (string)$sess['tenant_id'];
$papel = (string)($sess['papel'] ?? '');

if ($method === 'GET') {
  json_ok(['igreja' => igreja_publica($pdo, $tid)]);
}

function pode_admin_igreja(array $sess): bool {
  $papel = (string)($sess['papel'] ?? '');
  if ($papel === 'sede' || $papel === 'admin') return true;
  if ($papel === 'superintendente' && trim((string)($sess['escola_id'] ?? '')) === '') return true;
  return false;
}

$in = body();
$acao = (string)($in['acao'] ?? '');

if ($method === 'PATCH' && $acao === 'dados') {
  if (!pode_admin_igreja($sess)) json_err('Somente o superintendente da igreja altera o cadastro.', 403);
  if ($tid === '' || $tid === 'master') json_err('Conta master não tem cadastro de igreja.', 400);
  $nome = trim((string)($in['nome'] ?? ''));
  $cidade = trim((string)($in['cidade'] ?? ''));
  $responsavel = trim((string)($in['responsavel'] ?? ''));
  $email = strtolower(trim((string)($in['email'] ?? '')));
  $telefone = trim((string)($in['telefone'] ?? ''));
  if ($nome === '' || $responsavel === '') json_err('Informe o nome da igreja e o responsável.');
  if ($email !== '' && !email_valido($email)) json_err('Informe um e-mail válido.');
  $pdo->prepare('UPDATE tenants SET nome=?, cidade=?, responsavel=?, email=?, telefone=? WHERE id=?')
    ->execute([$nome, $cidade, $responsavel, $email, $telefone, $tid]);
  registrar_atividade($pdo, $tid, autor_de($sess), 'alterou igreja', 'Dados cadastrais');
  json_ok(['ok' => true, 'igreja' => igreja_publica($pdo, $tid)]);
}

if ($method === 'POST' && $acao === 'migrar') {
  if (!pode_admin_igreja($sess)) json_err('Somente o superintendente pode migrar o plano.', 403);
  $ig = igreja_publica($pdo, $tid);
  if (!$ig) json_err('Igreja não encontrada.', 404);
  if (($ig['plano'] ?? '') === 'igreja') json_err('Esta igreja já está no plano Igreja.');
  $pag = strtolower(trim((string)($in['pagamento'] ?? 'avista')));
  $checkout = $pag === 'parcelado' ? 'igreja12' : 'igreja';
  $out = iniciar_assinatura($pdo, [
    'nome' => $ig['nome'],
    'cidade' => $ig['cidade'],
    'responsavel' => $ig['responsavel'],
    'email' => $ig['email'],
    'telefone' => $ig['telefone'],
    'plano' => $checkout,
    'upgradeTenantId' => $tid,
  ]);
  json_ok($out);
}

if ($method === 'POST' && $acao === 'excluir_conta') {
  $uid = (string)($sess['user_id'] ?? '');
  $username = (string)($sess['username'] ?? '');
  if ($uid === '' || $papel === 'admin' || $tid === 'master') {
    json_err('Esta conta não pode ser excluída por aqui. Fale com o suporte.', 403);
  }
  $confirma = strtoupper(trim((string)($in['confirma'] ?? '')));
  if ($confirma !== 'EXCLUIR') {
    json_err('Digite EXCLUIR para confirmar a exclusão da conta.');
  }

  // Conta sede: encerra a igreja e remove usuários/sessões/dados.
  if ($papel === 'sede' || ($papel === 'superintendente' && trim((string)($sess['escola_id'] ?? '')) === '')) {
    $pdo->prepare('DELETE FROM sessions WHERE tenant_id = ?')->execute([$tid]);
    $pdo->prepare('DELETE FROM users WHERE tenant_id = ?')->execute([$tid]);
    $pdo->prepare('DELETE FROM app_state WHERE tenant_id = ?')->execute([$tid]);
    $pdo->prepare("UPDATE tenants SET status='excluida', email='', telefone='', responsavel='Conta excluída', username_admin='' WHERE id=?")
      ->execute([$tid]);
    registrar_atividade($pdo, $tid, autor_de($sess), 'excluiu conta', 'Igreja e acessos removidos pelo app');
    json_ok(['ok' => true, 'escopo' => 'igreja']);
  }

  // Demais papéis: remove só o usuário e as sessões dele.
  $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$uid]);
  $pdo->prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?')->execute([$uid, $tid]);
  registrar_atividade($pdo, $tid, autor_de($sess), 'excluiu conta', 'Usuário ' . $username . ' removido pelo app');
  json_ok(['ok' => true, 'escopo' => 'usuario']);
}

json_err('Método inválido', 405);
