<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Ville de référence utilisateur (onboarding + filtre Shotgun). */
final class Version20260621120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user.home_city for onboarding city selection and recommendations filter';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD home_city VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP home_city');
    }
}
