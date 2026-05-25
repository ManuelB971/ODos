<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260525200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Exploration carte: interrupteur utilisateur map_exploration_enabled';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD map_exploration_enabled BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('UPDATE "user" SET map_exploration_enabled = true WHERE map_exploration_consent_at IS NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP map_exploration_enabled');
    }
}
