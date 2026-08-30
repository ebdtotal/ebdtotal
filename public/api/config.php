<?php
/**
 * Banco e e-mail do EDB Total.
 * Padrão: SQLite (arquivo em api/data/) — funciona na HostGator sem criar MySQL.
 * Para MySQL, defina EBD_DB=mysql e preencha os campos abaixo.
 * O From precisa ser um endereço do domínio hospedado (ebdtotal.com).
 */
return [
  'driver' => getenv('EBD_DB') ?: 'sqlite',
  'mysql' => [
    'host' => getenv('EBD_MYSQL_HOST') ?: 'localhost',
    'name' => getenv('EBD_MYSQL_NAME') ?: 'jricon98_ebdtotal',
    'user' => getenv('EBD_MYSQL_USER') ?: 'jricon98_ebd',
    'pass' => getenv('EBD_MYSQL_PASS') ?: '',
  ],
  'mail' => [
    'from_name' => getenv('EBD_MAIL_FROM_NAME') ?: 'EDB Total',
    'from' => getenv('EBD_MAIL_FROM') ?: 'naoresponda@ebdtotal.com',
    'reply' => getenv('EBD_MAIL_REPLY') ?: 'naoresponda@ebdtotal.com',
  ],
  'pagamento' => [
    'preco_avista' => (float)(getenv('EBD_PRECO_AVISTA') ?: 1299),
    'preco_parcelado' => (float)(getenv('EBD_PRECO_PARCELADO') ?: 1499),
    'site_url' => rtrim((string)(getenv('EBD_SITE_URL') ?: 'https://ebdtotal.com'), '/'),
    /* Access Token do Mercado Pago (Checkout Pro). Prefira o arquivo api/data/pagamento.local.php
       (não entra no zip) para não perder o token ao publicar. Sem token, o cadastro fica pendente
       para o master confirmar. */
    'mp_access_token' => getenv('EBD_MP_ACCESS_TOKEN') ?: '',
    /* Opcional: link avulso (PIX/boleto) se ainda não houver Mercado Pago. */
    'link_pagamento' => getenv('EBD_PAGAMENTO_LINK') ?: '',
  ],
  'limites' => [
    'pessoas' => (int)(getenv('EBD_LIMITE_PESSOAS') ?: 600),
  ],
];
