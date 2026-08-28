<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$sess = auth();
db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$sess['token']]);
json_ok(['ok' => true]);
