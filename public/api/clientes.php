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
    json_ok(criar_cliente($pdo, $in, (string)($in['status'] ?? 'ativa')), 201);
  }
  json_ok(iniciar_assinatura($pdo, $in));
}

$sess = auth();
if ($sess['papel'] !== 'admin') json_err('Acesso restrito ao master.', 403);

if ($method === 'GET') {
  $rows = $pdo->query("SELECT t.id, t.nome, t.cidade, t.responsavel, t.email, t.telefone, t.status, t.username_admin, t.created_at, t.plano, t.pagamento, t.contratado_em, t.valido_ate, t.afiliado_codigo,
    (SELECT COUNT(*) FROM pessoas_idx p WHERE p.tenant_id = t.id) AS pessoas
    FROM tenants t WHERE t.id != 'master' ORDER BY t.created_at DESC")->fetchAll();
  $cad = $pdo->query('SELECT p.tenant_id, p.nome, p.tipo, p.status, p.escola, p.turma, t.nome AS igreja
    FROM pessoas_idx p JOIN tenants t ON t.id = p.tenant_id ORDER BY t.nome, p.nome')->fetchAll();
  $assinaturas = $pdo->query("SELECT id,nome,cidade,responsavel,email,telefone,status,username,created_at,pago_em,plano,upgrade_tenant_id,afiliado_codigo FROM signups ORDER BY created_at DESC")->fetchAll();
  $resumo = [
    'igrejas' => count($rows),
    'ativas' => 0,
    'suspensas' => 0,
    'trial' => 0,
    'essencial' => 0,
    'igreja' => 0,
    'vencendo' => 0,
    'vencidas' => 0,
    'pessoas' => 0,
  ];
  $hoje = time();
  foreach ($rows as $r) {
    $st = (string)($r['status'] ?? '');
    if ($st === 'ativa') $resumo['ativas']++;
    elseif ($st === 'suspensa') $resumo['suspensas']++;
    else $resumo['trial']++;
    $prod = produto_do_checkout((string)($r['plano'] ?? 'igreja'));
    if ($prod === 'essencial') $resumo['essencial']++;
    else $resumo['igreja']++;
    $resumo['pessoas'] += (int)($r['pessoas'] ?? 0);
    $fim = strtotime((string)($r['valido_ate'] ?? '')) ?: 0;
    if ($fim > 0 && $fim < $hoje) $resumo['vencidas']++;
    elseif ($fim > 0 && $fim < $hoje + 30 * 86400) $resumo['vencendo']++;
  }
  json_ok(['igrejas' => $rows, 'cadastros' => $cad, 'assinaturas' => $assinaturas, 'resumo' => $resumo, 'financeiro' => relatorio_caixa_assinaturas($pdo)]);
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
  if ($id === '' || $id === 'master') json_err('Igreja inválida.');

  if ($acao === 'dados') {
    $nome = trim((string)($in['nome'] ?? ''));
    $cidade = trim((string)($in['cidade'] ?? ''));
    $responsavel = trim((string)($in['responsavel'] ?? ''));
    $email = strtolower(trim((string)($in['email'] ?? '')));
    $telefone = trim((string)($in['telefone'] ?? ''));
    if ($nome === '' || $responsavel === '') json_err('Informe o nome da igreja e o responsável.');
    $pdo->prepare('UPDATE tenants SET nome=?, cidade=?, responsavel=?, email=?, telefone=? WHERE id=?')
      ->execute([$nome, $cidade, $responsavel, $email, $telefone, $id]);
    registrar_atividade($pdo, $id, autor_de($sess), 'alterou igreja', 'Cadastro pelo master');
    json_ok(['ok' => true, 'igreja' => igreja_publica($pdo, $id)]);
  }

  if ($acao === 'plano') {
    $produto = produto_do_checkout((string)($in['plano'] ?? 'igreja'));
    $pagamento = pagamento_do_checkout((string)($in['pagamento'] ?? 'avista'));
    $valido = trim((string)($in['validoAte'] ?? $in['valido_ate'] ?? ''));
    if ($valido === '') $valido = data_mais_um_ano(gmdate('c'));
    $pdo->prepare('UPDATE tenants SET plano=?, pagamento=?, valido_ate=? WHERE id=?')
      ->execute([$produto, $pagamento, $valido, $id]);
    registrar_atividade($pdo, $id, autor_de($sess), 'alterou plano', $produto . ' até ' . $valido);
    json_ok(['ok' => true, 'igreja' => igreja_publica($pdo, $id)]);
  }

  if ($acao === 'renovar') {
    $st = $pdo->prepare('SELECT valido_ate FROM tenants WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) json_err('Igreja não encontrada.', 404);
    $base = strtotime((string)$row['valido_ate']) ?: time();
    if ($base < time()) $base = time();
    $novo = gmdate('c', strtotime('+1 year', $base) ?: ($base + 365 * 86400));
    $pdo->prepare("UPDATE tenants SET valido_ate=?, status= CASE WHEN status = 'suspensa' THEN status ELSE 'ativa' END WHERE id=?")
      ->execute([$novo, $id]);
    registrar_atividade($pdo, $id, autor_de($sess), 'renovou plano', $novo);
    json_ok(['ok' => true, 'igreja' => igreja_publica($pdo, $id)]);
  }

  if ($acao === 'reset_senha') {
    $st = $pdo->prepare("SELECT * FROM users WHERE tenant_id = ? AND papel IN ('sede','admin') ORDER BY CASE papel WHEN 'sede' THEN 0 ELSE 1 END LIMIT 1");
    $st->execute([$id]);
    $user = $st->fetch();
    if (!$user) json_err('Login da sede não encontrado.', 404);
    $senha = senha_forte();
    gravar_senha_usuario($pdo, $user, $senha);
    $email = email_do_usuario($pdo, $user);
    $enviado = false;
    if ($email !== '') {
      $enviado = enviar_email($email, 'Nova senha — EBD Total', email_senha_provisoria((string)$user['nome'], (string)$user['username'], $senha));
    }
    registrar_atividade($pdo, $id, autor_de($sess), 'resetou senha', (string)$user['username']);
    json_ok(['ok' => true, 'login' => ['username' => $user['username'], 'senha' => $senha, 'email' => $email], 'emailEnviado' => $enviado]);
  }

  if ($acao === 'excluir') {
    $nome = '';
    $stn = $pdo->prepare('SELECT nome FROM tenants WHERE id = ?');
    $stn->execute([$id]);
    $rn = $stn->fetch();
    if ($rn) $nome = (string)$rn['nome'];
    excluir_igreja($pdo, $id);
    registrar_atividade($pdo, 'master', autor_de($sess), 'excluiu igreja', $nome !== '' ? $nome : $id);
    json_ok(['ok' => true]);
  }

  $status = (string)($in['status'] ?? '');
  if ($status === '' || !in_array($status, ['trial', 'ativa', 'suspensa'], true)) json_err('Dados inválidos.');
  $pdo->prepare('UPDATE tenants SET status = ? WHERE id = ?')->execute([$status, $id]);
  registrar_atividade($pdo, $id, autor_de($sess), 'alterou igreja', 'Status: ' . $status);
  json_ok(['ok' => true]);
}

json_err('Método inválido', 405);
