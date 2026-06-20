<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260619120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Permet de partager une activité ou un parcours dans un message de groupe (cartes riches, comme en message privé)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE group_message ADD activity_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE group_message ADD parcours_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE group_message ADD CONSTRAINT FK_GROUP_MESSAGE_ACTIVITY FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE group_message ADD CONSTRAINT FK_GROUP_MESSAGE_PARCOURS FOREIGN KEY (parcours_id) REFERENCES parcours (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_GROUP_MESSAGE_ACTIVITY ON group_message (activity_id)');
        $this->addSql('CREATE INDEX IDX_GROUP_MESSAGE_PARCOURS ON group_message (parcours_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE group_message DROP CONSTRAINT FK_GROUP_MESSAGE_ACTIVITY');
        $this->addSql('ALTER TABLE group_message DROP CONSTRAINT FK_GROUP_MESSAGE_PARCOURS');
        $this->addSql('DROP INDEX IDX_GROUP_MESSAGE_ACTIVITY');
        $this->addSql('DROP INDEX IDX_GROUP_MESSAGE_PARCOURS');
        $this->addSql('ALTER TABLE group_message DROP activity_id');
        $this->addSql('ALTER TABLE group_message DROP parcours_id');
    }
}
