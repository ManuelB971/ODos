<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260616130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Parcours (itinéraires collaboratifs) : tables parcours, parcours_item, parcours_collaborator';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE parcours (id SERIAL NOT NULL, owner_id INT DEFAULT NULL, title VARCHAR(120) NOT NULL, description VARCHAR(500) DEFAULT NULL, item_count INT DEFAULT 0 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_parcours_owner ON parcours (owner_id)');
        $this->addSql('ALTER TABLE parcours ADD CONSTRAINT FK_PARCOURS_OWNER FOREIGN KEY (owner_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE parcours_item (id SERIAL NOT NULL, parcours_id INT NOT NULL, activity_id INT NOT NULL, position INT DEFAULT 0 NOT NULL, note VARCHAR(280) DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_parcours_item_position ON parcours_item (parcours_id, position)');
        $this->addSql('ALTER TABLE parcours_item ADD CONSTRAINT FK_PARCOURS_ITEM_PARCOURS FOREIGN KEY (parcours_id) REFERENCES parcours (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE parcours_item ADD CONSTRAINT FK_PARCOURS_ITEM_ACTIVITY FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE parcours_collaborator (id SERIAL NOT NULL, parcours_id INT NOT NULL, user_id INT NOT NULL, added_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_parcours_collaborator ON parcours_collaborator (parcours_id, user_id)');
        $this->addSql('CREATE INDEX idx_parcours_collaborator_user ON parcours_collaborator (user_id)');
        $this->addSql('ALTER TABLE parcours_collaborator ADD CONSTRAINT FK_PARCOURS_COLLAB_PARCOURS FOREIGN KEY (parcours_id) REFERENCES parcours (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE parcours_collaborator ADD CONSTRAINT FK_PARCOURS_COLLAB_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE parcours_collaborator');
        $this->addSql('DROP TABLE parcours_item');
        $this->addSql('DROP TABLE parcours');
    }
}
