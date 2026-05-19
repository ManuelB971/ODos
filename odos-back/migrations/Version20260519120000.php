<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'RGPD Sprint 1: consentedAt sur user, author nullable sur comments';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD consented_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE comments ALTER author_id DROP NOT NULL');
        $this->addSql('ALTER TABLE comments DROP CONSTRAINT FK_comments_author');
        $this->addSql('ALTER TABLE comments ADD CONSTRAINT FK_comments_author FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE comments DROP CONSTRAINT FK_comments_author');
        $this->addSql('ALTER TABLE comments ADD CONSTRAINT FK_comments_author FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE comments ALTER author_id SET NOT NULL');
        $this->addSql('ALTER TABLE "user" DROP consented_at');
    }
}
