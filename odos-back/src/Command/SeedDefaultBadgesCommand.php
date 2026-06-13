<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\BadgeDefinition;
use App\Enum\BadgeRuleType;
use App\Repository\BadgeDefinitionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:badges:seed-defaults',
    description: 'Crée les badges par défaut (première visite, favoris, commentaire, note) s\'ils n\'existent pas.',
)]
final class SeedDefaultBadgesCommand extends Command
{
    public function __construct(
        private readonly BadgeDefinitionRepository $badgeRepository,
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $defaults = [
            [
                'code' => 'first_discovery',
                'name' => 'Première découverte',
                'description' => 'Tu as consulté ta première fiche activité. L\'aventure commence !',
                'ruleType' => BadgeRuleType::ActivityViews,
                'ruleConfig' => ['threshold' => 1],
                'sortOrder' => 10,
            ],
            [
                'code' => 'five_favorites',
                'name' => 'Collectionneur',
                'description' => 'Cinq activités en favoris — tu sais ce qui te plaît.',
                'ruleType' => BadgeRuleType::FavoritesCount,
                'ruleConfig' => ['threshold' => 5],
                'sortOrder' => 20,
            ],
            [
                'code' => 'first_comment',
                'name' => 'Voix locale',
                'description' => 'Ton premier commentaire partagé avec la communauté.',
                'ruleType' => BadgeRuleType::CommentsCount,
                'ruleConfig' => ['threshold' => 1],
                'sortOrder' => 30,
            ],
            [
                'code' => 'first_rating',
                'name' => 'Critique en herbe',
                'description' => 'Tu as noté ta première activité.',
                'ruleType' => BadgeRuleType::RatingsCount,
                'ruleConfig' => ['threshold' => 1],
                'sortOrder' => 40,
            ],
            [
                'code' => 'map_explorer_25',
                'name' => 'Explorateur',
                'description' => 'Tu as parcouru au moins 25 % des zones d\'activités sur la carte.',
                'ruleType' => BadgeRuleType::MapCells,
                'ruleConfig' => ['threshold' => 25],
                'sortOrder' => 50,
            ],
            [
                'code' => 'first_thread',
                'name' => 'Premier fil',
                'description' => 'Tu as créé ton premier fil de discussion.',
                'ruleType' => BadgeRuleType::ForumThreadsCount,
                'ruleConfig' => ['threshold' => 1],
                'sortOrder' => 60,
            ],
            [
                'code' => 'five_friends',
                'name' => 'Sociable',
                'description' => 'Tu as atteint 5 amis sur ODOS.',
                'ruleType' => BadgeRuleType::FriendsCount,
                'ruleConfig' => ['threshold' => 5],
                'sortOrder' => 70,
            ],
            [
                'code' => 'first_group',
                'name' => 'Esprit d\'équipe',
                'description' => 'Tu as rejoint ou créé ton premier groupe.',
                'ruleType' => BadgeRuleType::GroupsCount,
                'ruleConfig' => ['threshold' => 1],
                'sortOrder' => 80,
            ],
            [
                'code' => 'ten_replies',
                'name' => 'Contributeur',
                'description' => 'Tu as posté 10 réponses au forum.',
                'ruleType' => BadgeRuleType::ForumRepliesCount,
                'ruleConfig' => ['threshold' => 10],
                'sortOrder' => 90,
            ],
            [
                'code' => 'first_share',
                'name' => 'Généreux',
                'description' => 'Tu as partagé ta première activité.',
                'ruleType' => BadgeRuleType::SharesCount,
                'ruleConfig' => ['threshold' => 1],
                'sortOrder' => 100,
            ],
        ];

        $created = 0;
        foreach ($defaults as $row) {
            if (null !== $this->badgeRepository->findOneBy(['code' => $row['code']])) {
                continue;
            }

            $badge = new BadgeDefinition();
            $badge->setCode($row['code']);
            $badge->setName($row['name']);
            $badge->setDescription($row['description']);
            $badge->setRuleType($row['ruleType']);
            $badge->setRuleConfig($row['ruleConfig']);
            $badge->setSortOrder($row['sortOrder']);
            $badge->setIsActive(true);
            $this->em->persist($badge);
            ++$created;
        }

        $this->em->flush();
        $io->success(sprintf('%d badge(s) créé(s).', $created));

        return Command::SUCCESS;
    }
}
