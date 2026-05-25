<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\BadgeDefinition;
use App\Entity\User;
use App\Gamification\GamificationService;
use App\Repository\BadgeDefinitionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ADMIN')]
final class BadgeManualAwardController extends AbstractController
{
    public function __construct(
        private readonly BadgeDefinitionRepository $badgeRepository,
        private readonly UserRepository $userRepository,
        private readonly GamificationService $gamificationService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('/admin/badges/{badgeId}/award', name: 'admin_badge_award', methods: ['GET', 'POST'])]
    public function award(int $badgeId, Request $request): Response
    {
        $badge = $this->badgeRepository->find($badgeId);
        if (!$badge instanceof BadgeDefinition) {
            throw $this->createNotFoundException('Badge introuvable.');
        }

        if (Request::METHOD_POST === $request->getMethod()) {
            $userId = (int) $request->request->get('user_id', 0);
            $user = $this->userRepository->find($userId);
            if ($user instanceof User) {
                $this->gamificationService->awardBadge($user, $badge);
                $this->em->flush();
                $this->addFlash('success', sprintf('Badge « %s » attribué à %s.', $badge->getName(), $user->getEmail()));

                return $this->redirectToRoute('admin', [
                    '_fragment' => 'badges',
                ]);
            }
            $this->addFlash('danger', 'Utilisateur introuvable.');
        }

        $users = $this->userRepository->findBy([], ['email' => 'ASC'], 200);

        return $this->render('admin/badge_award.html.twig', [
            'badge' => $badge,
            'users' => $users,
        ]);
    }
}
