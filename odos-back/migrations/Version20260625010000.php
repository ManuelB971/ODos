<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260625010000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add light/dark JSON palettes on app_theme';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_theme ADD light_palette JSON DEFAULT NULL, ADD dark_palette JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_theme DROP light_palette, DROP dark_palette');
    }
}
