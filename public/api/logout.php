<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$sess = auth();
$pdo = db();
registrar_atividade($pdo, (string)$sess['tenant_id'], autor_de($sess), 'saiu', 'Saiu do sistema');
$pdo->prepare('DELETE FROM sessions WHERE token = ?')->execute([$sess['token']]);
json_ok(['ok' => true]);
