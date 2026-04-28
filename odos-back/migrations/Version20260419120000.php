<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Ajoute le champ `bio` (TEXT, nullable) sur la table `user` pour permettre
 * une description libre sur le profil utilisateur.
 */
final class Version20260419120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user.bio (TEXT, nullable) for public profile description';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD bio TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP bio');
    }
}
