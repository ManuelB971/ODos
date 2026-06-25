<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Nouveaux thèmes app : coucher de soleil, vignoble, ardoise. */
final class Version20260621140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed additional app themes (sunset, vineyard, slate)';
    }

    public function up(Schema $schema): void
    {
        // ON CONFLICT DO NOTHING : idempotent si le slug existe déjà (réexécution / env. déjà seedé).
        $this->addSql("INSERT INTO app_theme (slug, label, description, is_active, sort_order) VALUES
            ('sunset', 'Coucher de Soleil', 'Violets et corail chaleureux pour les fins de journée.', true, 3),
            ('vineyard', 'Vignoble', 'Grenat profond et touches dorées, ambiance vendanges.', true, 4),
            ('slate', 'Ardoise', 'Gris neutres et un accent bleu net, sobre et lisible.', true, 5)
            ON CONFLICT (slug) DO NOTHING
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DELETE FROM app_theme WHERE slug IN ('sunset', 'vineyard', 'slate')");
    }
}
