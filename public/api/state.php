<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$sess = auth();
$pdo = db();
$tenantId = $sess['tenant_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $st = $pdo->prepare('SELECT json FROM app_state WHERE tenant_id = ?');
  $st->execute([$tenantId]);
  $row = $st->fetch();
  $state = $row ? json_decode((string)$row['json'], true) : null;
  if (is_array($state)) {
    $antes = json_encode($state, JSON_UNESCAPED_UNICODE);
    $state = reconciliar_acessos($state);
    if (json_encode($state, JSON_UNESCAPED_UNICODE) !== $antes) {
      $now = gmdate('c');
      $pdo->prepare('UPDATE app_state SET json = ?, updated_at = ? WHERE tenant_id = ?')
        ->execute([json_encode($state, JSON_UNESCAPED_UNICODE), $now, $tenantId]);
      sync_users($pdo, $tenantId, $state);
    }
  }
  json_ok(['state' => $state, 'usuarioId' => $sess['user_id']]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
  json_err('Método inválido', 405);
}

$in = body();
$state = $in['state'] ?? null;
if (!is_array($state)) json_err('Estado inválido.');

$state['sessaoId'] = $sess['user_id'];
$state = reconciliar_acessos($state);
$json = json_encode($state, JSON_UNESCAPED_UNICODE);
$now = gmdate('c');
$chk = $pdo->prepare('SELECT tenant_id FROM app_state WHERE tenant_id = ?');
$chk->execute([$tenantId]);
if ($chk->fetch()) {
  $pdo->prepare('UPDATE app_state SET json = ?, updated_at = ? WHERE tenant_id = ?')->execute([$json, $now, $tenantId]);
} else {
  $pdo->prepare('INSERT INTO app_state (tenant_id, json, updated_at) VALUES (?,?,?)')->execute([$tenantId, $json, $now]);
}

indexar_pessoas($pdo, $tenantId, $state);
sync_users($pdo, $tenantId, $state);
sync_cadastros($pdo, $tenantId, $state);
json_ok(['ok' => true, 'updatedAt' => $now]);
