<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $in = body();
  $nome = trim((string)($in['nome'] ?? ''));
  $email = strtolower(trim((string)($in['email'] ?? '')));
  $telefone = trim((string)($in['telefone'] ?? ''));
  $igreja = trim((string)($in['igreja'] ?? ''));
  if ($nome === '' || $igreja === '') json_err('Informe seu nome e o nome da igreja.');
  if (!email_valido($email)) json_err('Informe um e-mail válido.');
  if ($telefone === '') json_err('Informe o telefone ou WhatsApp.');

  $id = uid('demo');
  $now = gmdate('c');
  $afiliado = normalizar_codigo_afiliado((string)($in['afiliadoCodigo'] ?? $in['afiliado_codigo'] ?? $in['ref'] ?? ''));
  if ($afiliado !== '' && !afiliado_ativo($pdo, $afiliado)) $afiliado = '';
  $pdo->prepare('INSERT INTO demos (id,nome,email,telefone,igreja,status,created_at,afiliado_codigo) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$id, $nome, $email, $telefone, $igreja, 'nova', $now, $afiliado]);

  json_ok([
    'ok' => true,
    'mensagem' => 'Recebemos seu pedido. Em breve entraremos em contato para agendar a demonstração.',
    'id' => $id,
  ], 201);
}

$sess = auth();
if (($sess['papel'] ?? '') !== 'admin') json_err('Acesso restrito ao master.', 403);

if ($method === 'GET') {
  $rows = $pdo->query('SELECT * FROM demos ORDER BY created_at DESC')->fetchAll();
  $resumo = ['total' => count($rows), 'novas' => 0, 'contactadas' => 0, 'concluidas' => 0];
  foreach ($rows as $r) {
    $st = (string)($r['status'] ?? 'nova');
    if ($st === 'contactada') $resumo['contactadas']++;
    elseif ($st === 'concluida') $resumo['concluidas']++;
    else $resumo['novas']++;
  }
  json_ok(['demos' => $rows, 'resumo' => $resumo]);
}

if ($method === 'PATCH') {
  $in = body();
  $id = (string)($in['id'] ?? '');
  if ($id === '') json_err('Pedido inválido.');
  $st = $pdo->prepare('SELECT id, status FROM demos WHERE id = ?');
  $st->execute([$id]);
  $row = $st->fetch();
  if (!$row) json_err('Pedido não encontrado.', 404);

  $acao = (string)($in['acao'] ?? '');
  if ($acao === 'excluir') {
    $pdo->prepare('DELETE FROM demos WHERE id = ?')->execute([$id]);
    registrar_atividade($pdo, 'master', autor_de($sess), 'excluiu demo', $id);
    json_ok(['ok' => true]);
  }

  $status = (string)($in['status'] ?? '');
  if (!in_array($status, ['nova', 'contactada', 'concluida'], true)) json_err('Status inválido.');
  $notas = array_key_exists('notas', $in) ? trim((string)$in['notas']) : null;
  if ($notas !== null) {
    $pdo->prepare('UPDATE demos SET status=?, notas=? WHERE id=?')->execute([$status, $notas, $id]);
  } else {
    $pdo->prepare('UPDATE demos SET status=? WHERE id=?')->execute([$status, $id]);
  }
  if ($status !== 'nova') {
    $pdo->prepare("UPDATE demos SET contato_em=? WHERE id=? AND (contato_em IS NULL OR contato_em='')")
      ->execute([gmdate('c'), $id]);
  }
  registrar_atividade($pdo, 'master', autor_de($sess), 'atualizou demo', $status . ' · ' . $id);
  json_ok(['ok' => true]);
}

json_err('Método inválido', 405);
