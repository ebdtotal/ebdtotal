<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $in = body();
  $acao = strtolower(trim((string)($in['acao'] ?? 'clique')));

  if ($acao === 'clique') {
    $codigo = (string)($in['codigo'] ?? $in['ref'] ?? '');
    $path = (string)($in['path'] ?? '');
    json_ok(registrar_clique_afiliado($pdo, $codigo, $path), 201);
  }

  $sess = auth();
  if (($sess['papel'] ?? '') !== 'admin') json_err('Acesso restrito ao master.', 403);

  if ($acao === 'criar') {
    $nome = trim((string)($in['nome'] ?? ''));
    if ($nome === '') json_err('Informe o nome do afiliado.');
    $codigo = normalizar_codigo_afiliado((string)($in['codigo'] ?? ''));
    if ($codigo === '') $codigo = gerar_codigo_afiliado($pdo, $nome);
    $st = $pdo->prepare('SELECT id FROM afiliados WHERE codigo = ?');
    $st->execute([$codigo]);
    if ($st->fetch()) json_err('Já existe um afiliado com este código.');
    $id = uid('af');
    $notas = trim((string)($in['notas'] ?? ''));
    $pdo->prepare('INSERT INTO afiliados (id, codigo, nome, ativo, notas, created_at) VALUES (?,?,?,?,?,?)')
      ->execute([$id, $codigo, $nome, 1, $notas, gmdate('c')]);
    registrar_atividade($pdo, 'master', autor_de($sess), 'criou afiliado', $codigo);
    $rel = relatorio_afiliados($pdo);
    $item = null;
    foreach ($rel['afiliados'] as $a) {
      if ($a['id'] === $id) { $item = $a; break; }
    }
    json_ok(['ok' => true, 'afiliado' => $item, 'resumo' => $rel['resumo']], 201);
  }

  json_err('Ação inválida.');
}

$sess = auth();
if (($sess['papel'] ?? '') !== 'admin') json_err('Acesso restrito ao master.', 403);

if ($method === 'GET') {
  $codigo = normalizar_codigo_afiliado((string)($_GET['codigo'] ?? ''));
  $rel = relatorio_afiliados($pdo);
  if ($codigo !== '') {
    $detalhe = clientes_do_afiliado($pdo, $codigo);
    json_ok(array_merge($rel, ['codigo' => $codigo, 'clientes' => $detalhe['clientes'], 'signups' => $detalhe['signups']]));
  }
  json_ok($rel);
}

if ($method === 'PATCH') {
  $in = body();
  $id = (string)($in['id'] ?? '');
  if ($id === '') json_err('Afiliado inválido.');
  $st = $pdo->prepare('SELECT * FROM afiliados WHERE id = ?');
  $st->execute([$id]);
  $row = $st->fetch();
  if (!$row) json_err('Afiliado não encontrado.', 404);

  $acao = (string)($in['acao'] ?? 'atualizar');
  if ($acao === 'excluir') {
    $codigo = (string)$row['codigo'];
    $pdo->prepare('DELETE FROM afiliado_cliques WHERE codigo = ?')->execute([$codigo]);
    $pdo->prepare('DELETE FROM afiliados WHERE id = ?')->execute([$id]);
    registrar_atividade($pdo, 'master', autor_de($sess), 'excluiu afiliado', $codigo);
    json_ok(['ok' => true]);
  }

  $nome = array_key_exists('nome', $in) ? trim((string)$in['nome']) : (string)$row['nome'];
  $notas = array_key_exists('notas', $in) ? trim((string)$in['notas']) : (string)($row['notas'] ?? '');
  $ativo = array_key_exists('ativo', $in) ? ((int)!!$in['ativo']) : (int)$row['ativo'];
  if ($nome === '') json_err('Informe o nome do afiliado.');
  $pdo->prepare('UPDATE afiliados SET nome=?, notas=?, ativo=? WHERE id=?')
    ->execute([$nome, $notas, $ativo, $id]);
  registrar_atividade($pdo, 'master', autor_de($sess), 'atualizou afiliado', (string)$row['codigo']);
  json_ok(['ok' => true, 'resumo' => relatorio_afiliados($pdo)['resumo']]);
}

json_err('Método inválido', 405);
