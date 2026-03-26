<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add is_published on activity for admin workflow and public API filtering';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE activity ADD is_published BOOLEAN DEFAULT true NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE activity DROP is_published');
    }
}
