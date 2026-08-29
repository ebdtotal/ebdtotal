<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$sess = auth();
$papel = (string)($sess['papel'] ?? '');
if (!in_array($papel, ['admin', 'sede', 'superintendente'], true)) {
  json_err('Acesso restrito ao master e ao superintendente.', 403);
}

$pdo = db();
$tenantId = (string)$sess['tenant_id'];
$ehMaster = $papel === 'admin';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_err('Método inválido', 405);

$q = strtolower(trim((string)($_GET['q'] ?? '')));
$filtroPapel = strtolower(trim((string)($_GET['papel'] ?? '')));
$filtroUser = strtolower(trim((string)($_GET['username'] ?? '')));
$limit = (int)($_GET['limit'] ?? 200);
if ($limit < 20) $limit = 20;
if ($limit > 500) $limit = 500;

$sql = "SELECT a.id, a.tenant_id, a.user_id, a.username, a.nome, a.papel, a.acao, a.detalhe, a.ip, a.created_at,
               t.nome AS igreja
        FROM atividades a
        LEFT JOIN tenants t ON t.id = a.tenant_id
        WHERE 1=1";
$params = [];
if (!$ehMaster) {
  $sql .= ' AND a.tenant_id = ?';
  $params[] = $tenantId;
}
if ($filtroPapel !== '') {
  $sql .= ' AND a.papel = ?';
  $params[] = $filtroPapel;
}
if ($filtroUser !== '') {
  $sql .= ' AND lower(a.username) = ?';
  $params[] = $filtroUser;
}
if ($q !== '') {
  $sql .= ' AND (lower(a.username) LIKE ? OR lower(a.nome) LIKE ? OR lower(a.acao) LIKE ? OR lower(a.detalhe) LIKE ? OR lower(COALESCE(t.nome,\'\')) LIKE ?)';
  $like = '%' . $q . '%';
  array_push($params, $like, $like, $like, $like, $like);
}
$sql .= ' ORDER BY a.created_at DESC LIMIT ' . $limit;
$st = $pdo->prepare($sql);
$st->execute($params);
$atividades = $st->fetchAll();

$sqlLogins = "SELECT u.id, u.username, u.nome, u.papel, u.tenant_id, t.nome AS igreja,
    (SELECT a.created_at FROM atividades a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS ultima_em,
    (SELECT a.acao FROM atividades a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS ultima_acao,
    (SELECT a.detalhe FROM atividades a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS ultima_detalhe
  FROM users u
  LEFT JOIN tenants t ON t.id = u.tenant_id
  WHERE 1=1";
$p2 = [];
if (!$ehMaster) {
  $sqlLogins .= ' AND u.tenant_id = ?';
  $p2[] = $tenantId;
}
$sqlLogins .= ' ORDER BY CASE WHEN ultima_em IS NULL THEN 1 ELSE 0 END, ultima_em DESC, u.nome ASC';
$st2 = $pdo->prepare($sqlLogins);
$st2->execute($p2);
$logins = $st2->fetchAll();

json_ok(['atividades' => $atividades, 'logins' => $logins, 'master' => $ehMaster]);
