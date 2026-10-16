<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261016120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'RGPD: user.last_active_at for inactive account purge (existing accounts start today)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD last_active_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN "user".last_active_at IS \'(DC2Type:datetime_immutable)\'');
        // Les comptes existants partent d'aujourd'hui : aucun n'est purgé à la mise en prod.
        $this->addSql('UPDATE "user" SET last_active_at = NOW()');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP last_active_at');
    }
}
