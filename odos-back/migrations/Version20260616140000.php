<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260616140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Permet de partager un parcours dans un message de chat (carte cliquable)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_message ADD parcours_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE chat_message ADD CONSTRAINT FK_CHAT_MESSAGE_PARCOURS FOREIGN KEY (parcours_id) REFERENCES parcours (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_CHAT_MESSAGE_PARCOURS ON chat_message (parcours_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_message DROP CONSTRAINT FK_CHAT_MESSAGE_PARCOURS');
        $this->addSql('DROP INDEX IDX_CHAT_MESSAGE_PARCOURS');
        $this->addSql('ALTER TABLE chat_message DROP parcours_id');
    }
}
