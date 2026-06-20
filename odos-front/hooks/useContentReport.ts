import { useMutation } from '@tanstack/react-query';

import { reportChatMessage, reportComment, reportGroupMessage, reportUser } from '@/scripts/api';
import type { ForumReportReason } from '@/types';

/** Cible d'un signalement hors forum (message privé / groupe / commentaire / profil). */
export type ContentReportTarget =
  | { kind: 'chat'; id: number }
  | { kind: 'group'; id: number }
  | { kind: 'comment'; id: number }
  | { kind: 'user'; id: number };

/**
 * Signalement de contenu hors forum. Une seule mutation route vers le bon
 * endpoint selon la cible ; le motif réutilise `ForumReportReason` (générique).
 */
export function useContentReport() {
  const report = useMutation({
    mutationFn: ({
      target,
      reason,
      details,
    }: {
      target: ContentReportTarget;
      reason: ForumReportReason;
      details?: string;
    }) => {
      switch (target.kind) {
        case 'chat':
          return reportChatMessage(target.id, reason, details);
        case 'group':
          return reportGroupMessage(target.id, reason, details);
        case 'comment':
          return reportComment(target.id, reason, details);
        case 'user':
          return reportUser(target.id, reason, details);
      }
    },
  });

  return { report };
}
