<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Index de filtrage par ville + normalisation des valeurs existantes.
 *
 * Les requêtes catalogue / recommandations / validation filtrent par
 * (is_published, ville) de façon insensible à la casse : on pose donc un index
 * fonctionnel sur (is_published, LOWER(city)) et on nettoie les villes déjà en base.
 */
final class Version20260621130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add functional index on activity (is_published, lower(city)) and trim existing city values';
    }

    public function up(Schema $schema): void
    {
        // Nettoyage : espaces parasites et chaînes vides -> NULL.
        $this->addSql("UPDATE activity SET city = NULLIF(TRIM(city), '') WHERE city IS NOT NULL AND city <> NULLIF(TRIM(city), '')");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_activity_pub_city ON activity (is_published, (LOWER(city)))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_activity_pub_city');
    }
}
