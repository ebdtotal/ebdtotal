<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

$pdo = db();
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$in = body();
if (!$in) $in = $_POST;

$topic = trim((string)($in['type'] ?? $in['topic'] ?? $_GET['type'] ?? $_GET['topic'] ?? ''));
$id = trim((string)(
  ($in['data']['id'] ?? '')
  ?: ($in['id'] ?? '')
  ?: ($_GET['data_id'] ?? '')
  ?: ($_GET['id'] ?? '')
));
if ($id === '' && isset($_GET['data.id'])) $id = trim((string)$_GET['data.id']);

$sid = trim((string)($_GET['sid'] ?? $_GET['external_reference'] ?? $in['sid'] ?? ''));
$paymentId = trim((string)(
  $_GET['payment_id']
  ?? $_GET['collection_id']
  ?? $in['payment_id']
  ?? ''
));

if ($topic !== '' && $id !== '') {
  processar_notificacao_mp($pdo, $topic, $id);
  json_ok(['ok' => true]);
}

if ($method === 'POST' && $id !== '') {
  processar_notificacao_mp($pdo, $topic !== '' ? $topic : 'payment', $id);
  json_ok(['ok' => true]);
}

if ($sid !== '') {
  if ($paymentId !== '') {
    processar_pagamento_mp($pdo, $paymentId);
  }
  json_ok(status_signup_publico($pdo, $sid));
}

if ($paymentId !== '') {
  processar_pagamento_mp($pdo, $paymentId);
  json_ok(['ok' => true]);
}

if ($id !== '') {
  processar_notificacao_mp($pdo, $topic !== '' ? $topic : 'payment', $id);
}

json_ok(['ok' => true]);
