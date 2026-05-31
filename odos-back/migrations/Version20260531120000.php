<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260531120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'OAuth social login: google_id et apple_id sur user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD google_id VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD apple_id VARCHAR(255) DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_USER_GOOGLE_ID ON "user" (google_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_USER_APPLE_ID ON "user" (apple_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_USER_GOOGLE_ID');
        $this->addSql('DROP INDEX UNIQ_USER_APPLE_ID');
        $this->addSql('ALTER TABLE "user" DROP google_id');
        $this->addSql('ALTER TABLE "user" DROP apple_id');
    }
}
