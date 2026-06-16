<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Activity;
use App\Entity\Conversation;
use App\Entity\Parcours;
use App\Entity\User;
use App\Repository\ActivityRepository;
use App\Repository\ChatMessageRepository;
use App\Repository\ConversationRepository;
use App\Repository\ParcoursRepository;
use App\Repository\UserRepository;
use App\Service\ChatService;
use App\Service\ParcoursService;
use App\Service\SocialSerializer;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/chat')]
final class ChatController extends AbstractController
{
    private const PER_PAGE = 30;

    public function __construct(
        private readonly Security $security,
        private readonly ConversationRepository $conversationRepository,
        private readonly ChatMessageRepository $messageRepository,
        private readonly UserRepository $userRepository,
        private readonly ActivityRepository $activityRepository,
        private readonly ParcoursRepository $parcoursRepository,
        private readonly ParcoursService $parcoursService,
        private readonly ChatService $chatService,
        private readonly SocialSerializer $serializer,
        private readonly UserActionThrottleService $throttle,
    ) {
    }

    #[Route('/conversations', name: 'api_chat_conversations_list', methods: ['GET'])]
    public function listConversations(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, (int) $request->query->get('page', 1));
        $items = $this->conversationRepository->findForUser($user, $page, self::PER_PAGE);

        $member = array_map(function (Conversation $c) use ($user) {
            $unread = $this->messageRepository->countUnreadInConversation($c, $user);

            return $this->serializer->conversationToArray($c, $user, $unread);
        }, $items);

        return $this->json([
            'member' => $member,
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('/conversations', name: 'api_chat_conversations_open', methods: ['POST'])]
    public function openConversation(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $peer = $this->userRepository->find((int) ($request->toArray()['userId'] ?? 0));
        if (!$peer instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $conversation = $this->chatService->openConversation($user, $peer);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'conversation' => $this->serializer->conversationToArray($conversation, $user, 0),
        ], Response::HTTP_CREATED);
    }

    #[Route('/conversations/{id}/messages', name: 'api_chat_messages_list', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function listMessages(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $conversation = $this->conversationRepository->find($id);
        if (!$conversation instanceof Conversation || !$conversation->involves($user)) {
            return $this->json(['message' => 'Conversation introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $items = array_reverse($this->messageRepository->findForConversationPaginated($conversation, $page, self::PER_PAGE));

        return $this->json([
            'member' => array_map(fn ($m) => $this->serializer->chatMessageToArray($m, $user), $items),
            'totalItems' => $this->messageRepository->countForConversation($conversation),
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('/conversations/{id}/messages', name: 'api_chat_messages_create', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function sendMessage(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $conversation = $this->conversationRepository->find($id);
        if (!$conversation instanceof Conversation || !$conversation->involves($user)) {
            return $this->json(['message' => 'Conversation introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->throttle->assertCanSendChatMessage((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $payload = $request->toArray();

        $activity = null;
        $activityId = (int) ($payload['activityId'] ?? 0);
        if ($activityId > 0) {
            $activity = $this->activityRepository->find($activityId);
            if (!$activity instanceof Activity) {
                return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
            }
        }

        $parcours = null;
        $parcoursId = (int) ($payload['parcoursId'] ?? 0);
        if ($parcoursId > 0) {
            $parcours = $this->parcoursRepository->find($parcoursId);
            if (!$parcours instanceof Parcours || !$this->parcoursService->canAccess($parcours, $user)) {
                return $this->json(['message' => 'Parcours introuvable.'], Response::HTTP_NOT_FOUND);
            }
        }

        try {
            $message = $this->chatService->sendMessage(
                $user,
                $conversation,
                (string) ($payload['content'] ?? ''),
                $activity,
                $parcours,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markChatMessageSent((int) $user->getId());

        return $this->json([
            'message' => $this->serializer->chatMessageToArray($message, $user),
        ], Response::HTTP_CREATED);
    }

    #[Route('/conversations/{id}/read', name: 'api_chat_conversations_read', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function markRead(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $conversation = $this->conversationRepository->find($id);
        if (!$conversation instanceof Conversation || !$conversation->involves($user)) {
            return $this->json(['message' => 'Conversation introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->chatService->markRead($user, $conversation);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['message' => 'Lu.']);
    }

    private function requireUser(): User
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    private function throttleResponse(ThrottledActionException $e): JsonResponse
    {
        return $this->json(
            ['message' => $e->getMessage(), 'retryAfterSeconds' => $e->getRetryAfterSeconds(), 'code' => 'RATE_LIMITED'],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) $e->getRetryAfterSeconds()]
        );
    }
}
