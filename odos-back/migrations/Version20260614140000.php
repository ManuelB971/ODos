<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Contrainte d\'unicité sur l\'alias public (les NULL multiples restent autorisés)';
    }

    public function up(Schema $schema): void
    {
        // Postgres : un index unique sur une colonne nullable autorise plusieurs NULL
        // (les NULL sont considérés distincts), donc les comptes sans alias ne s'entrechoquent pas.
        $this->addSql('CREATE UNIQUE INDEX uniq_user_alias ON "user" (alias)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_user_alias');
    }
}
