<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Enforce bidirectional friendship uniqueness (one row per user pair regardless of direction).
 */
final class Version20260613150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace directional friendship unique index with unordered pair index';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_friendship_pair');
        $this->addSql('CREATE UNIQUE INDEX uniq_friendship_pair_unordered ON friendship (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_friendship_pair_unordered');
        $this->addSql('CREATE UNIQUE INDEX uniq_friendship_pair ON friendship (sender_id, receiver_id)');
    }
}
