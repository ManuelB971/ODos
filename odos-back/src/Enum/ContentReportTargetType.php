<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Cibles de signalement hors forum (modération UGC) : message privé, message de
 * groupe, commentaire d'activité, profil utilisateur. Les fils/réponses de forum
 * restent gérés par {@see ForumReportTargetType}.
 */
enum ContentReportTargetType: string
{
    case ChatMessage = 'chat_message';
    case GroupMessage = 'group_message';
    case Comment = 'comment';
    case UserProfile = 'user_profile';
}
