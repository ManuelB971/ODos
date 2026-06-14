<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Chat de groupe : table group_message et suivi de lecture par membre';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE group_message (id SERIAL NOT NULL, group_id INT NOT NULL, author_id INT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_group_message_group_created ON group_message (group_id, created_at)');
        $this->addSql('ALTER TABLE group_message ADD CONSTRAINT FK_GROUP_MESSAGE_GROUP FOREIGN KEY (group_id) REFERENCES activity_group (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE group_message ADD CONSTRAINT FK_GROUP_MESSAGE_AUTHOR FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN group_message.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('ALTER TABLE group_member ADD last_read_group_message_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN group_member.last_read_group_message_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE group_member DROP last_read_group_message_at');
        $this->addSql('DROP TABLE group_message');
    }
}
