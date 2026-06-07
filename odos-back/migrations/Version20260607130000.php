<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Bouton « J'ai visité » : table de liaison user_visited_activity.
 * Alimente le collaborative filtering des recommandations.
 */
final class Version20260607130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Activités visitées : table de liaison user_visited_activity (signal « J\'ai visité »)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user_visited_activity (user_id INT NOT NULL, activity_id INT NOT NULL, PRIMARY KEY (user_id, activity_id))');
        $this->addSql('CREATE INDEX IDX_USER_VISITED_USER ON user_visited_activity (user_id)');
        $this->addSql('CREATE INDEX IDX_USER_VISITED_ACTIVITY ON user_visited_activity (activity_id)');
        $this->addSql('ALTER TABLE user_visited_activity ADD CONSTRAINT FK_USER_VISITED_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_visited_activity ADD CONSTRAINT FK_USER_VISITED_ACTIVITY FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE user_visited_activity');
    }
}
