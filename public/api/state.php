<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$sess = auth();
$pdo = db();
$tenantId = $sess['tenant_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $st = $pdo->prepare('SELECT json, updated_at FROM app_state WHERE tenant_id = ?');
  $st->execute([$tenantId]);
  $row = $st->fetch();
  $state = $row ? json_decode((string)$row['json'], true) : [];
  if (!is_array($state)) $state = [];
  $state['avaliacoes'] = filtrar_removidos(
    is_array($state['avaliacoes'] ?? null) ? $state['avaliacoes'] : [],
    unir_ids($state['avaliacoesRemovidas'] ?? null, [])
  );
  $state['certificados'] = filtrar_removidos(
    is_array($state['certificados'] ?? null) ? $state['certificados'] : [],
    unir_ids($state['certificadosRemovidos'] ?? null, [])
  );
  $updatedAt = is_array($row) ? (string)($row['updated_at'] ?? '') : '';
  $antes = json_encode($state, JSON_UNESCAPED_UNICODE);
  $ts = $updatedAt !== '' ? $updatedAt : gmdate('c');
  $state = stamp_missing_updated_at($state, $ts);
  $state = mesclar_usuarios_banco($pdo, $tenantId, $state);
  $state = reconciliar_acessos($state);
  if (json_encode($state, JSON_UNESCAPED_UNICODE) !== $antes) {
    $now = gmdate('c');
    sync_users($pdo, $tenantId, $state);
    $chk = $pdo->prepare('SELECT tenant_id FROM app_state WHERE tenant_id = ?');
    $chk->execute([$tenantId]);
    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    if ($chk->fetch()) {
      $pdo->prepare('UPDATE app_state SET json = ?, updated_at = ? WHERE tenant_id = ?')
        ->execute([$json, $now, $tenantId]);
    } else {
      $pdo->prepare('INSERT INTO app_state (tenant_id, json, updated_at) VALUES (?,?,?)')
        ->execute([$tenantId, $json, $now]);
    }
    $updatedAt = $now;
  }
  json_ok(['state' => $state, 'usuarioId' => $sess['user_id'], 'updatedAt' => $updatedAt]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
  json_err('Método inválido', 405);
}

$in = body();
$state = $in['state'] ?? null;
if (!is_array($state)) json_err('Estado inválido.');

$stOld = $pdo->prepare('SELECT json, updated_at FROM app_state WHERE tenant_id = ?');
$stOld->execute([$tenantId]);
$oldRow = $stOld->fetch();
$old = $oldRow ? json_decode((string)$oldRow['json'], true) : [];
if (!is_array($old)) $old = [];
$now = gmdate('c');
$old = stamp_missing_updated_at($old, is_array($oldRow) ? (string)($oldRow['updated_at'] ?? $now) : $now);
$antesDiff = $old;
$state = merge_state($old, $state);

$state['sessaoId'] = $sess['user_id'];
$state = reconciliar_acessos($state);
sync_users($pdo, $tenantId, $state);
$json = json_encode($state, JSON_UNESCAPED_UNICODE);
$chk = $pdo->prepare('SELECT tenant_id FROM app_state WHERE tenant_id = ?');
$chk->execute([$tenantId]);
if ($chk->fetch()) {
  $pdo->prepare('UPDATE app_state SET json = ?, updated_at = ? WHERE tenant_id = ?')->execute([$json, $now, $tenantId]);
} else {
  $pdo->prepare('INSERT INTO app_state (tenant_id, json, updated_at) VALUES (?,?,?)')->execute([$tenantId, $json, $now]);
}

indexar_pessoas($pdo, $tenantId, $state);
sync_cadastros($pdo, $tenantId, $state);
try {
  gravar_diff_estado($pdo, $tenantId, $sess, $antesDiff, $state);
} catch (Throwable $e) {
  /* */
}
json_ok(['ok' => true, 'updatedAt' => $now]);
