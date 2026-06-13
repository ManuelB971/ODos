<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260613140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Invitations groupes privés (group_invitation)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE group_invitation (id SERIAL NOT NULL, group_id INT NOT NULL, invitee_id INT NOT NULL, invited_by_id INT NOT NULL, status VARCHAR(20) DEFAULT \'pending\' NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_invitation_invitee_status ON group_invitation (invitee_id, status)');
        $this->addSql('CREATE UNIQUE INDEX uniq_group_invitee_pending ON group_invitation (group_id, invitee_id)');
        $this->addSql('ALTER TABLE group_invitation ADD CONSTRAINT FK_INVITATION_GROUP FOREIGN KEY (group_id) REFERENCES activity_group (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE group_invitation ADD CONSTRAINT FK_INVITATION_INVITEE FOREIGN KEY (invitee_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE group_invitation ADD CONSTRAINT FK_INVITATION_INVITER FOREIGN KEY (invited_by_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN group_invitation.created_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE group_invitation');
    }
}
