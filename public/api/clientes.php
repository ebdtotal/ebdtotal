<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

function criar_cliente(PDO $pdo, array $in): array {
  $nome = trim((string)($in['nome'] ?? ''));
  $responsavel = trim((string)($in['responsavel'] ?? ''));
  if ($nome === '' || $responsavel === '') json_err('Informe o nome da igreja e o responsável.');

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
    ->execute([$tid, $nome, $cidade, $responsavel, $email, $telefone, 'trial', $username, $now]);
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

  json_ok([
    'igreja' => [
      'id' => $tid,
      'nome' => $nome,
      'status' => 'trial',
    ],
    'login' => [
      'username' => $username,
      'senha' => $senha,
      'nome' => $responsavel,
      'email' => $email,
    ],
    'emailEnviado' => $emailEnviado,
  ], 201);
}

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $in = body();
  criar_cliente($pdo, $in);
}

$sess = auth();
if ($sess['papel'] !== 'admin') json_err('Acesso restrito ao master.', 403);

if ($method === 'GET') {
  $rows = $pdo->query("SELECT id,nome,cidade,responsavel,email,telefone,status,username_admin,created_at FROM tenants WHERE id != 'master' ORDER BY created_at DESC")->fetchAll();
  $cad = $pdo->query('SELECT p.tenant_id, p.nome, p.tipo, p.status, p.escola, p.turma, t.nome AS igreja
    FROM pessoas_idx p JOIN tenants t ON t.id = p.tenant_id ORDER BY t.nome, p.nome')->fetchAll();
  json_ok(['igrejas' => $rows, 'cadastros' => $cad]);
}

if ($method === 'PATCH') {
  $in = body();
  $id = (string)($in['id'] ?? '');
  $status = (string)($in['status'] ?? '');
  if ($id === '' || !in_array($status, ['trial', 'ativa', 'suspensa'], true)) json_err('Dados inválidos.');
  $pdo->prepare('UPDATE tenants SET status = ? WHERE id = ?')->execute([$status, $id]);
  registrar_atividade($pdo, $id, autor_de($sess), 'alterou igreja', 'Status: ' . $status);
  json_ok(['ok' => true]);
}

json_err('Método inválido', 405);
