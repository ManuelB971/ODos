<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260525213000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user.alias and user.avatar_url for public profile display';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD alias VARCHAR(60) DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD avatar_url VARCHAR(512) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP avatar_url');
        $this->addSql('ALTER TABLE "user" DROP alias');
    }
}
