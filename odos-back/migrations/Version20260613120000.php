<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Module social & communautaire : amis, forum, groupes, partages d'activités.
 */
final class Version20260613120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Module social : champs User, friendship, activity_group, group_member, forum_thread, forum_reply, forum_reply_like, shared_activity';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD profile_public BOOLEAN DEFAULT true NOT NULL');
        $this->addSql('ALTER TABLE "user" ADD social_consented_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD is_forum_banned BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('COMMENT ON COLUMN "user".social_consented_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE friendship (id SERIAL NOT NULL, sender_id INT NOT NULL, receiver_id INT NOT NULL, status VARCHAR(20) DEFAULT \'pending\' NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, accepted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_friendship_receiver_status ON friendship (receiver_id, status)');
        $this->addSql('CREATE INDEX idx_friendship_sender_status ON friendship (sender_id, status)');
        $this->addSql('CREATE UNIQUE INDEX uniq_friendship_pair ON friendship (sender_id, receiver_id)');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT FK_7234A45FF624B39D FOREIGN KEY (sender_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT FK_7234A45FCD53EDB6 FOREIGN KEY (receiver_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT chk_friendship_not_self CHECK (sender_id != receiver_id)');
        $this->addSql('COMMENT ON COLUMN friendship.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN friendship.accepted_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE activity_group (id SERIAL NOT NULL, created_by_id INT DEFAULT NULL, name VARCHAR(100) NOT NULL, description VARCHAR(500) DEFAULT NULL, avatar_url VARCHAR(500) DEFAULT NULL, is_private BOOLEAN DEFAULT false NOT NULL, member_count INT DEFAULT 1 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_group_public ON activity_group (is_private, member_count)');
        $this->addSql('ALTER TABLE activity_group ADD CONSTRAINT FK_ACTIVITY_GROUP_CREATOR FOREIGN KEY (created_by_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN activity_group.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE group_member (id SERIAL NOT NULL, group_id INT NOT NULL, user_id INT NOT NULL, role VARCHAR(20) DEFAULT \'member\' NOT NULL, joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_member_user ON group_member (user_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_group_member ON group_member (group_id, user_id)');
        $this->addSql('ALTER TABLE group_member ADD CONSTRAINT FK_GROUP_MEMBER_GROUP FOREIGN KEY (group_id) REFERENCES activity_group (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE group_member ADD CONSTRAINT FK_GROUP_MEMBER_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN group_member.joined_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE forum_thread (id SERIAL NOT NULL, author_id INT DEFAULT NULL, activity_id INT DEFAULT NULL, category_id INT DEFAULT NULL, group_id INT DEFAULT NULL, title VARCHAR(200) NOT NULL, content TEXT NOT NULL, is_pinned BOOLEAN DEFAULT false NOT NULL, is_locked BOOLEAN DEFAULT false NOT NULL, reply_count INT DEFAULT 0 NOT NULL, last_reply_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_thread_activity ON forum_thread (activity_id, created_at)');
        $this->addSql('CREATE INDEX idx_thread_category ON forum_thread (category_id, created_at)');
        $this->addSql('CREATE INDEX idx_thread_group ON forum_thread (group_id, created_at)');
        $this->addSql('CREATE INDEX idx_thread_global ON forum_thread (is_pinned, last_reply_at)');
        $this->addSql('ALTER TABLE forum_thread ADD CONSTRAINT FK_FORUM_THREAD_AUTHOR FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forum_thread ADD CONSTRAINT FK_FORUM_THREAD_ACTIVITY FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forum_thread ADD CONSTRAINT FK_FORUM_THREAD_CATEGORY FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forum_thread ADD CONSTRAINT FK_FORUM_THREAD_GROUP FOREIGN KEY (group_id) REFERENCES activity_group (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN forum_thread.last_reply_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN forum_thread.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE forum_reply (id SERIAL NOT NULL, author_id INT DEFAULT NULL, thread_id INT NOT NULL, content TEXT NOT NULL, is_hidden BOOLEAN DEFAULT false NOT NULL, like_count INT DEFAULT 0 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_reply_thread_date ON forum_reply (thread_id, created_at)');
        $this->addSql('ALTER TABLE forum_reply ADD CONSTRAINT FK_FORUM_REPLY_AUTHOR FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forum_reply ADD CONSTRAINT FK_FORUM_REPLY_THREAD FOREIGN KEY (thread_id) REFERENCES forum_thread (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN forum_reply.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE forum_reply_like (user_id INT NOT NULL, reply_id INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(user_id, reply_id))');
        $this->addSql('ALTER TABLE forum_reply_like ADD CONSTRAINT FK_REPLY_LIKE_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forum_reply_like ADD CONSTRAINT FK_REPLY_LIKE_REPLY FOREIGN KEY (reply_id) REFERENCES forum_reply (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('COMMENT ON COLUMN forum_reply_like.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('CREATE TABLE shared_activity (id SERIAL NOT NULL, sender_id INT NOT NULL, receiver_id INT DEFAULT NULL, group_id INT DEFAULT NULL, activity_id INT NOT NULL, message VARCHAR(280) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, seen_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_shared_receiver_seen ON shared_activity (receiver_id, seen_at)');
        $this->addSql('CREATE INDEX idx_shared_group ON shared_activity (group_id, created_at)');
        $this->addSql('ALTER TABLE shared_activity ADD CONSTRAINT FK_SHARED_SENDER FOREIGN KEY (sender_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE shared_activity ADD CONSTRAINT FK_SHARED_RECEIVER FOREIGN KEY (receiver_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE shared_activity ADD CONSTRAINT FK_SHARED_GROUP FOREIGN KEY (group_id) REFERENCES activity_group (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE shared_activity ADD CONSTRAINT FK_SHARED_ACTIVITY FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE shared_activity ADD CONSTRAINT chk_shared_target CHECK (receiver_id IS NOT NULL OR group_id IS NOT NULL)');
        $this->addSql('COMMENT ON COLUMN shared_activity.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN shared_activity.seen_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE shared_activity');
        $this->addSql('DROP TABLE forum_reply_like');
        $this->addSql('DROP TABLE forum_reply');
        $this->addSql('DROP TABLE forum_thread');
        $this->addSql('DROP TABLE group_member');
        $this->addSql('DROP TABLE activity_group');
        $this->addSql('DROP TABLE friendship');
        $this->addSql('ALTER TABLE "user" DROP profile_public');
        $this->addSql('ALTER TABLE "user" DROP social_consented_at');
        $this->addSql('ALTER TABLE "user" DROP is_forum_banned');
    }
}
