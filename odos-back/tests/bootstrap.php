<?php

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

// Force Symfony test environment for PHPUnit bootstrap.
$_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = 'test';
$_SERVER['APP_DEBUG'] = $_ENV['APP_DEBUG'] = '1';
putenv('APP_ENV=test');
putenv('APP_DEBUG=1');

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}
