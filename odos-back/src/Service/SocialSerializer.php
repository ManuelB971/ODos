<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\ActivityGroup;
use App\Entity\ChatMessage;
use App\Entity\Conversation;
use App\Entity\GroupMessage;
use App\Entity\ForumReply;
use App\Entity\ForumThread;
use App\Entity\Friendship;
use App\Entity\SharedActivity;
use App\Entity\User;
use App\Enum\FriendshipStatus;
use App\Enum\GroupRole;
use App\Entity\GroupInvitation;
use App\Entity\GroupMember;

final class SocialSerializer
{
    /**
     * @return array<string, mixed>
     */
    public function userSnippet(?User $user): ?array
    {
        if (null === $user) {
            return null;
        }

        return [
            'id' => $user->getId(),
            'displayName' => $user->getDisplayName(),
            'avatarUrl' => $user->getAvatarUrl(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function friendshipToArray(Friendship $friendship, User $viewer): array
    {
        $sender = $friendship->getSender();
        $receiver = $friendship->getReceiver();
        $other = ($sender?->getId() === $viewer->getId()) ? $receiver : $sender;

        return [
            'id' => $friendship->getId(),
            'status' => $friendship->getStatus()->value,
            'isIncoming' => $receiver?->getId() === $viewer->getId() && FriendshipStatus::Pending === $friendship->getStatus(),
            'otherUser' => $this->userSnippet($other),
            'createdAt' => $friendship->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'acceptedAt' => $friendship->getAcceptedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function threadToArray(ForumThread $thread): array
    {
        return [
            'id' => $thread->getId(),
            'title' => $thread->getTitle(),
            'content' => $thread->getContent(),
            'author' => $this->userSnippet($thread->getAuthor()),
            'activityId' => $thread->getActivity()?->getId(),
            'categoryId' => $thread->getCategory()?->getId(),
            'groupId' => $thread->getGroup()?->getId(),
            'isPinned' => $thread->isPinned(),
            'isLocked' => $thread->isLocked(),
            'replyCount' => $thread->getReplyCount(),
            'lastReplyAt' => $thread->getLastReplyAt()?->format(\DateTimeInterface::ATOM),
            'createdAt' => $thread->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function replyToArray(ForumReply $reply, ?User $viewer = null, bool $likedByViewer = false): array
    {
        return [
            'id' => $reply->getId(),
            'content' => $reply->getContent(),
            'author' => $this->userSnippet($reply->getAuthor()),
            'threadId' => $reply->getThread()?->getId(),
            'isHidden' => $reply->isHidden(),
            'likeCount' => $reply->getLikeCount(),
            'likedByMe' => $likedByViewer,
            'createdAt' => $reply->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function groupToArray(ActivityGroup $group, ?int $unreadCount = null): array
    {
        $data = [
            'id' => $group->getId(),
            'name' => $group->getName(),
            'description' => $group->getDescription(),
            'avatarUrl' => $group->getAvatarUrl(),
            'isPrivate' => $group->isPrivate(),
            'memberCount' => $group->getMemberCount(),
            'createdAt' => $group->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];

        if (null !== $unreadCount) {
            $data['unreadCount'] = $unreadCount;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function groupMemberToArray(GroupMember $member): array
    {
        return [
            'id' => $member->getId(),
            'user' => $this->userSnippet($member->getUser()),
            'role' => $member->getRole()->value,
            'joinedAt' => $member->getJoinedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function sharedActivityToArray(SharedActivity $shared): array
    {
        $activity = $shared->getActivity();

        return [
            'id' => $shared->getId(),
            'sender' => $this->userSnippet($shared->getSender()),
            'receiver' => $this->userSnippet($shared->getReceiver()),
            'groupId' => $shared->getGroup()?->getId(),
            'activity' => null !== $activity ? [
                'id' => $activity->getId(),
                'name' => $activity->getName(),
                'city' => $activity->getCity(),
            ] : null,
            'message' => $shared->getMessage(),
            'createdAt' => $shared->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'seenAt' => $shared->getSeenAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function groupInvitationToArray(GroupInvitation $invitation): array
    {
        return [
            'id' => $invitation->getId(),
            'group' => null !== $invitation->getGroup() ? $this->groupToArray($invitation->getGroup()) : null,
            'invitedBy' => $this->userSnippet($invitation->getInvitedBy()),
            'status' => $invitation->getStatus()->value,
            'createdAt' => $invitation->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function conversationToArray(Conversation $conversation, User $viewer, int $unreadCount = 0): array
    {
        return [
            'id' => $conversation->getId(),
            'otherUser' => $this->userSnippet($conversation->otherParticipant($viewer)),
            'lastMessageAt' => $conversation->getLastMessageAt()?->format(\DateTimeInterface::ATOM),
            'unreadCount' => $unreadCount,
            'createdAt' => $conversation->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function chatMessageToArray(ChatMessage $message, User $viewer): array
    {
        return [
            'id' => $message->getId(),
            'content' => $message->getContent(),
            'author' => $this->userSnippet($message->getAuthor()),
            'conversationId' => $message->getConversation()?->getId(),
            'isMine' => $message->getAuthor()?->getId() === $viewer->getId(),
            'readAt' => $message->getReadAt()?->format(\DateTimeInterface::ATOM),
            'createdAt' => $message->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function groupMessageToArray(GroupMessage $message, User $viewer): array
    {
        return [
            'id' => $message->getId(),
            'content' => $message->getContent(),
            'author' => $this->userSnippet($message->getAuthor()),
            'groupId' => $message->getGroup()?->getId(),
            'isMine' => $message->getAuthor()?->getId() === $viewer->getId(),
            'createdAt' => $message->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
