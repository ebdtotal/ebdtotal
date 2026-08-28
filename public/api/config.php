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
    'from' => getenv('EBD_MAIL_FROM') ?: 'nao-responda@ebdtotal.com',
    'reply' => getenv('EBD_MAIL_REPLY') ?: 'nao-responda@ebdtotal.com',
  ],
];
