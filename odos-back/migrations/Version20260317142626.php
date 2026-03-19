<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260317142626 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE user_favorite_activity (user_id INT NOT NULL, activity_id INT NOT NULL, PRIMARY KEY (user_id, activity_id))');
        $this->addSql('CREATE INDEX IDX_FE3CAA80A76ED395 ON user_favorite_activity (user_id)');
        $this->addSql('CREATE INDEX IDX_FE3CAA8081C06096 ON user_favorite_activity (activity_id)');
        $this->addSql('ALTER TABLE user_favorite_activity ADD CONSTRAINT FK_FE3CAA80A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_favorite_activity ADD CONSTRAINT FK_FE3CAA8081C06096 FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE activity ADD price DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE activity ADD image_url VARCHAR(512) DEFAULT NULL');
        $this->addSql('ALTER TABLE activity ADD date_start TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE activity ADD date_end TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE user_favorite_activity DROP CONSTRAINT FK_FE3CAA80A76ED395');
        $this->addSql('ALTER TABLE user_favorite_activity DROP CONSTRAINT FK_FE3CAA8081C06096');
        $this->addSql('DROP TABLE user_favorite_activity');
        $this->addSql('ALTER TABLE activity DROP price');
        $this->addSql('ALTER TABLE activity DROP image_url');
        $this->addSql('ALTER TABLE activity DROP date_start');
        $this->addSql('ALTER TABLE activity DROP date_end');
    }
}
