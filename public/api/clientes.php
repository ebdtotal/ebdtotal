<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $in = body();
  $origem = strtolower(trim((string)($in['origem'] ?? '')));
  if ($origem === 'master') {
    $sess = auth();
    if ($sess['papel'] !== 'admin') json_err('Acesso restrito ao master.', 403);
    json_ok(criar_cliente($pdo, $in, 'trial'), 201);
  }
  json_ok(iniciar_assinatura($pdo, $in));
}

$sess = auth();
if ($sess['papel'] !== 'admin') json_err('Acesso restrito ao master.', 403);

if ($method === 'GET') {
  $rows = $pdo->query("SELECT id,nome,cidade,responsavel,email,telefone,status,username_admin,created_at FROM tenants WHERE id != 'master' ORDER BY created_at DESC")->fetchAll();
  $cad = $pdo->query('SELECT p.tenant_id, p.nome, p.tipo, p.status, p.escola, p.turma, t.nome AS igreja
    FROM pessoas_idx p JOIN tenants t ON t.id = p.tenant_id ORDER BY t.nome, p.nome')->fetchAll();
  $assinaturas = $pdo->query('SELECT id,nome,cidade,responsavel,email,telefone,status,username,created_at,pago_em,plano FROM signups ORDER BY created_at DESC')->fetchAll();
  json_ok(['igrejas' => $rows, 'cadastros' => $cad, 'assinaturas' => $assinaturas]);
}

if ($method === 'PATCH') {
  $in = body();
  $acao = (string)($in['acao'] ?? '');
  if ($acao === 'confirmar_signup') {
    $id = (string)($in['id'] ?? '');
    if ($id === '') json_err('Assinatura inválida.');
    $out = ativar_signup_pago($pdo, $id, 'manual');
    registrar_atividade($pdo, (string)($out['igreja']['id'] ?? ''), autor_de($sess), 'confirmou pagamento', $id);
    json_ok(['ok' => true, 'login' => $out['login'], 'emailEnviado' => $out['emailEnviado'] ?? false]);
  }
  $id = (string)($in['id'] ?? '');
  $status = (string)($in['status'] ?? '');
  if ($id === '' || !in_array($status, ['trial', 'ativa', 'suspensa'], true)) json_err('Dados inválidos.');
  $pdo->prepare('UPDATE tenants SET status = ? WHERE id = ?')->execute([$status, $id]);
  registrar_atividade($pdo, $id, autor_de($sess), 'alterou igreja', 'Status: ' . $status);
  json_ok(['ok' => true]);
}

json_err('Método inválido', 405);
