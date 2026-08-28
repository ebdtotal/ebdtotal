<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$pdo = db();
$igrejas = (int)$pdo->query("SELECT COUNT(*) FROM tenants WHERE id != 'master' AND status != 'suspensa'")->fetchColumn();
$alunos = (int)$pdo->query("SELECT COUNT(*) FROM pessoas_idx WHERE tipo = 'Aluno' AND status = 'Ativo'")->fetchColumn();
$professores = (int)$pdo->query("SELECT COUNT(*) FROM pessoas_idx WHERE tipo = 'Professor' AND status = 'Ativo'")->fetchColumn();
$pessoas = (int)$pdo->query("SELECT COUNT(*) FROM pessoas_idx WHERE status = 'Ativo'")->fetchColumn();
$escolas = 0;
foreach ($pdo->query('SELECT json FROM app_state') as $row) {
  $s = json_decode($row['json'], true);
  if (is_array($s) && isset($s['escolas'])) $escolas += count($s['escolas']);
}

json_ok([
  'igrejas' => $igrejas,
  'escolas' => $escolas,
  'alunos' => $alunos,
  'professores' => $professores,
  'pessoas' => $pessoas,
]);
