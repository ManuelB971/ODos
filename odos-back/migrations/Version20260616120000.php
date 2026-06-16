<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260616120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Permet de partager une activité dans un message de chat (carte riche)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_message ADD activity_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE chat_message ADD CONSTRAINT FK_CHAT_MESSAGE_ACTIVITY FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_CHAT_MESSAGE_ACTIVITY ON chat_message (activity_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_message DROP CONSTRAINT FK_CHAT_MESSAGE_ACTIVITY');
        $this->addSql('DROP INDEX IDX_CHAT_MESSAGE_ACTIVITY');
        $this->addSql('ALTER TABLE chat_message DROP activity_id');
    }
}
