<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260620120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Parcours : pochette personnalisée (cover_image_url) et visibilité privé/public (façon playlist)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE parcours ADD cover_image_url VARCHAR(500) DEFAULT NULL');
        $this->addSql("ALTER TABLE parcours ADD visibility VARCHAR(20) DEFAULT 'private' NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE parcours DROP cover_image_url');
        $this->addSql('ALTER TABLE parcours DROP visibility');
    }
}
