<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260320124500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add phone_number field on user table for admin SMS MFA';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD phone_number VARCHAR(32) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP phone_number');
    }
}
