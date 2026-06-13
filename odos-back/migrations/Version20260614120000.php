<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Signalements forum, tokens push, conversations et messages chat';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE forum_report (id SERIAL NOT NULL, reporter_id INT NOT NULL, thread_id INT DEFAULT NULL, reply_id INT DEFAULT NULL, target_type VARCHAR(10) NOT NULL, target_id INT NOT NULL, reason VARCHAR(20) NOT NULL, details TEXT DEFAULT NULL, status VARCHAR(20) DEFAULT \'pending\' NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_forum_report_status ON forum_report (status, created_at)');
        $this->addSql('CREATE UNIQUE INDEX uniq_forum_report_reporter_target ON forum_report (reporter_id, target_type, target_id)');
        $this->addSql('ALTER TABLE forum_report ADD CONSTRAINT FK_FORUM_REPORT_REPORTER FOREIGN KEY (reporter_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forum_report ADD CONSTRAINT FK_FORUM_REPORT_THREAD FOREIGN KEY (thread_id) REFERENCES forum_thread (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forum_report ADD CONSTRAINT FK_FORUM_REPORT_REPLY FOREIGN KEY (reply_id) REFERENCES forum_reply (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN forum_report.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE push_token (id SERIAL NOT NULL, user_id INT NOT NULL, token VARCHAR(255) NOT NULL, platform VARCHAR(20) NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_push_token_user ON push_token (user_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_push_token ON push_token (token)');
        $this->addSql('ALTER TABLE push_token ADD CONSTRAINT FK_PUSH_TOKEN_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN push_token.updated_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE conversation (id SERIAL NOT NULL, user_one_id INT NOT NULL, user_two_id INT NOT NULL, last_message_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_conversation_pair ON conversation (user_one_id, user_two_id)');
        $this->addSql('ALTER TABLE conversation ADD CONSTRAINT FK_CONVERSATION_USER_ONE FOREIGN KEY (user_one_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE conversation ADD CONSTRAINT FK_CONVERSATION_USER_TWO FOREIGN KEY (user_two_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE conversation ADD CONSTRAINT chk_conversation_not_self CHECK (user_one_id <> user_two_id)');
        $this->addSql('COMMENT ON COLUMN conversation.last_message_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN conversation.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE chat_message (id SERIAL NOT NULL, conversation_id INT NOT NULL, author_id INT NOT NULL, content TEXT NOT NULL, read_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_chat_message_conversation_created ON chat_message (conversation_id, created_at)');
        $this->addSql('ALTER TABLE chat_message ADD CONSTRAINT FK_CHAT_MESSAGE_CONVERSATION FOREIGN KEY (conversation_id) REFERENCES conversation (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE chat_message ADD CONSTRAINT FK_CHAT_MESSAGE_AUTHOR FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN chat_message.read_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN chat_message.created_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE chat_message');
        $this->addSql('DROP TABLE conversation');
        $this->addSql('DROP TABLE push_token');
        $this->addSql('DROP TABLE forum_report');
    }
}
