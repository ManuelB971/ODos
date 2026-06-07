<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260607120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Thèmes app : table app_theme + données initiales (default, ocean, forest)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE app_theme (
            id SERIAL NOT NULL,
            slug VARCHAR(64) NOT NULL,
            label VARCHAR(128) NOT NULL,
            description VARCHAR(255) DEFAULT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INT NOT NULL DEFAULT 0,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_APP_THEME_SLUG ON app_theme (slug)');

        $this->addSql("INSERT INTO app_theme (slug, label, description, is_active, sort_order) VALUES
            ('default', 'ODOS', 'Le thème original chaud et chaleureux.', true, 0),
            ('ocean', 'Côte Atlantique', 'Tons bleus et marins, parfait pour explorer le littoral.', true, 1),
            ('forest', 'Forêt Boréale', 'Tons verts et boisés pour les amoureux de nature.', true, 2)
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE app_theme');
    }
}
