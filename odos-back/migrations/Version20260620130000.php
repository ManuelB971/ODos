<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Modération UGC : table content_report pour signaler messages privés, messages
 * de groupe, commentaires et profils (hors forum, géré par forum_report).
 */
final class Version20260620130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Signalements de contenu hors forum (content_report) : chat, groupe, commentaire, profil';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE content_report (id SERIAL NOT NULL, reporter_id INT NOT NULL, chat_message_id INT DEFAULT NULL, group_message_id INT DEFAULT NULL, comment_id INT DEFAULT NULL, reported_user_id INT DEFAULT NULL, target_type VARCHAR(20) NOT NULL, target_id INT NOT NULL, reason VARCHAR(20) NOT NULL, details TEXT DEFAULT NULL, status VARCHAR(20) DEFAULT \'pending\' NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_content_report_status ON content_report (status, created_at)');
        $this->addSql('CREATE UNIQUE INDEX uniq_content_report_reporter_target ON content_report (reporter_id, target_type, target_id)');
        $this->addSql('ALTER TABLE content_report ADD CONSTRAINT FK_CONTENT_REPORT_REPORTER FOREIGN KEY (reporter_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE content_report ADD CONSTRAINT FK_CONTENT_REPORT_CHAT_MESSAGE FOREIGN KEY (chat_message_id) REFERENCES chat_message (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE content_report ADD CONSTRAINT FK_CONTENT_REPORT_GROUP_MESSAGE FOREIGN KEY (group_message_id) REFERENCES group_message (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE content_report ADD CONSTRAINT FK_CONTENT_REPORT_COMMENT FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE content_report ADD CONSTRAINT FK_CONTENT_REPORT_REPORTED_USER FOREIGN KEY (reported_user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN content_report.created_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE content_report');
    }
}
