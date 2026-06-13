import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface ExportProfile {
    id: number | null;
    email: string | null;
    alias: string | null;
    bio: string | null;
    displayName: string | null;
    consentedAt: string | null;
    interests: Array<{ id: number; name: string }>;
}

export interface ExportActivity {
    id: number;
    name: string;
    city: string | null;
}

export interface ExportComment {
    id: number;
    activityId: number | null;
    content: string;
    createdAt: string | null;
}

export interface ExportRating {
    activityId: number | null;
    activityName: string | null;
    score: number;
    createdAt: string | null;
}

export interface ExportBadge {
    code: string | null;
    name: string | null;
    unlockedAt: string;
}

export interface ExportData {
    exportedAt: string;
    format: string;
    profile: ExportProfile;
    favorites: ExportActivity[];
    visitedActivities?: ExportActivity[];
    comments: ExportComment[];
    ratings: ExportRating[];
    badges: ExportBadge[];
    mapExploration?: { zoneKey: string; visitedCellIds: number[] };
    social?: ExportSocialData;
}

export interface ExportSocialData {
    friends: Array<{ alias: string; since: string | null }>;
    forumThreads: Array<{ title: string; content: string; createdAt: string }>;
    forumReplies: Array<{ content: string; createdAt: string }>;
    sharedActivitiesSent: Array<{ activityName: string | null; message: string | null; createdAt: string }>;
    sharedActivitiesReceived: Array<{ activityName: string | null; message: string | null; createdAt: string }>;
    groups: Array<{ name: string | null; role: string; joinedAt: string }>;
    forumLikes: Array<{ replyExcerpt: string; threadTitle: string | null; createdAt: string }>;
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

function stars(score: number): string {
    return '★'.repeat(score) + '☆'.repeat(5 - score);
}

function activityList(items: ExportActivity[]): string {
    if (items.length === 0) return '<p class="empty">Aucune activité.</p>';
    return `<ul>${items.map((a) => `<li><strong>${esc(a.name)}</strong>${a.city ? ` — <span class="city">${esc(a.city)}</span>` : ''}</li>`).join('')}</ul>`;
}

function esc(str: string | null | undefined): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildHtml(data: ExportData): string {
    const { profile, favorites, visitedActivities = [], comments, ratings, badges, exportedAt, social } = data;

    const interests =
        profile.interests?.length
            ? profile.interests.map((i) => `<span class="tag">${esc(i.name)}</span>`).join('')
            : '<span class="empty">Aucun centre d\'intérêt.</span>';

    const commentsHtml =
        comments.length === 0
            ? '<p class="empty">Aucun commentaire.</p>'
            : comments
                  .map(
                      (c) => `
      <div class="comment-item">
        <p class="comment-content">${esc(c.content)}</p>
        <p class="comment-meta">${c.activityId ? `Activité #${c.activityId}` : ''} · ${formatDate(c.createdAt)}</p>
      </div>`
                  )
                  .join('');

    const ratingsHtml =
        ratings.length === 0
            ? '<p class="empty">Aucune note.</p>'
            : `<table><thead><tr><th>Activité</th><th>Note</th><th>Date</th></tr></thead><tbody>
        ${ratings.map((r) => `<tr><td>${esc(r.activityName)}</td><td class="stars">${stars(r.score)}</td><td>${formatDate(r.createdAt)}</td></tr>`).join('')}
      </tbody></table>`;

    const badgesHtml =
        badges.length === 0
            ? '<p class="empty">Aucun badge.</p>'
            : `<ul class="badge-list">${badges.map((b) => `<li>🏅 <strong>${esc(b.name)}</strong> <span class="meta">(${formatDate(b.unlockedAt)})</span></li>`).join('')}</ul>`;

    const socialHtml = social ? buildSocialHtml(social) : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Export ODOS — ${esc(profile.displayName ?? profile.email ?? 'utilisateur')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #ffffff;
    padding: 0;
  }

  /* ── Cover page ── */
  .cover {
    background: linear-gradient(135deg, #4f1ca8 0%, #7c3aed 60%, #a78bfa 100%);
    color: white;
    padding: 56px 40px 48px;
    position: relative;
    page-break-after: always;
  }
  .cover-logo {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 4px;
    text-transform: uppercase;
    opacity: 0.95;
    margin-bottom: 4px;
  }
  .cover-tagline {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.65;
    margin-bottom: 48px;
  }
  .cover-title {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .cover-subtitle {
    font-size: 14px;
    opacity: 0.8;
    margin-bottom: 32px;
  }
  .cover-info {
    font-size: 12px;
    opacity: 0.7;
    line-height: 1.7;
  }
  .cover-badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 11px;
    letter-spacing: 1px;
    margin-top: 20px;
  }

  /* ── Content ── */
  .content { padding: 32px 40px; }

  .section {
    margin-bottom: 28px;
    page-break-inside: avoid;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid #7c3aed;
    padding-bottom: 6px;
    margin-bottom: 14px;
  }
  .section-icon {
    font-size: 16px;
  }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #7c3aed;
    letter-spacing: 0.5px;
  }
  .section-count {
    margin-left: auto;
    font-size: 11px;
    color: #888;
    background: #f3f0ff;
    border-radius: 10px;
    padding: 2px 8px;
  }

  /* ── Profile ── */
  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .profile-field { line-height: 1.5; }
  .profile-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .profile-value { font-size: 13px; color: #1a1a2e; font-weight: 500; }
  .profile-bio {
    grid-column: 1 / -1;
    background: #faf9ff;
    border-left: 3px solid #a78bfa;
    padding: 10px 14px;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #444;
    font-size: 12px;
    line-height: 1.6;
    margin-top: 4px;
  }

  /* ── Tags ── */
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .tag {
    background: #f3f0ff;
    border: 1px solid #ddd6fe;
    color: #5b21b6;
    border-radius: 12px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 500;
  }

  /* ── Lists ── */
  ul { list-style: none; padding: 0; }
  ul li {
    padding: 6px 0 6px 12px;
    border-left: 2px solid #e8e4ff;
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 1.4;
  }
  ul li:last-child { margin-bottom: 0; }
  .city { color: #888; font-size: 11px; }

  /* ── Comments ── */
  .comment-item {
    background: #fafafa;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 8px;
  }
  .comment-content { font-size: 12px; color: #333; line-height: 1.5; margin-bottom: 4px; }
  .comment-meta { font-size: 10px; color: #aaa; }

  /* ── Ratings table ── */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #f3f0ff; }
  th { text-align: left; padding: 7px 10px; font-size: 11px; color: #5b21b6; font-weight: 600; letter-spacing: 0.3px; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  .stars { color: #f59e0b; letter-spacing: 1px; }

  /* ── Badges ── */
  .badge-list li { border-left-color: #fbbf24; }

  /* ── Footer ── */
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #eee;
    font-size: 10px;
    color: #aaa;
    line-height: 1.6;
    text-align: center;
  }

  .empty { color: #bbb; font-style: italic; font-size: 12px; }
  .meta { color: #aaa; font-size: 11px; font-weight: normal; }
</style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <div class="cover-logo">ODOS</div>
  <div class="cover-tagline">Découvrez les activités autour de vous</div>
  <div class="cover-title">Export de mes données personnelles</div>
  <div class="cover-subtitle">${esc(profile.displayName ?? profile.email ?? 'utilisateur')}</div>
  <div class="cover-info">
    Document généré le ${formatDate(exportedAt)}<br/>
    Conformément à l'article 20 du Règlement Général sur la Protection des Données (RGPD)<br/>
    Ce document contient l'ensemble de vos données personnelles enregistrées dans ODOS.
  </div>
  <div class="cover-badge">RGPD · Art. 20 · Portabilité des données</div>
</div>

<!-- Content -->
<div class="content">

  <!-- Profil -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">👤</span>
      <span class="section-title">Mon profil</span>
    </div>
    <div class="profile-grid">
      <div class="profile-field">
        <div class="profile-label">Email</div>
        <div class="profile-value">${esc(profile.email)}</div>
      </div>
      <div class="profile-field">
        <div class="profile-label">Alias</div>
        <div class="profile-value">${esc(profile.alias) || '<span class="empty">—</span>'}</div>
      </div>
      <div class="profile-field">
        <div class="profile-label">Compte créé</div>
        <div class="profile-value">${formatDate(profile.consentedAt)}</div>
      </div>
      ${
          profile.bio
              ? `<div class="profile-bio">"${esc(profile.bio)}"</div>`
              : ''
      }
    </div>
  </div>

  <!-- Centres d'intérêt -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">🎯</span>
      <span class="section-title">Centres d'intérêt</span>
      <span class="section-count">${profile.interests?.length ?? 0}</span>
    </div>
    <div class="tags">${interests}</div>
  </div>

  <!-- Favoris -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">❤️</span>
      <span class="section-title">Mes favoris</span>
      <span class="section-count">${favorites.length}</span>
    </div>
    ${activityList(favorites)}
  </div>

  <!-- Visites -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">✅</span>
      <span class="section-title">Lieux visités</span>
      <span class="section-count">${visitedActivities.length}</span>
    </div>
    ${activityList(visitedActivities)}
  </div>

  <!-- Notes -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">⭐</span>
      <span class="section-title">Mes notes</span>
      <span class="section-count">${ratings.length}</span>
    </div>
    ${ratingsHtml}
  </div>

  <!-- Commentaires -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">💬</span>
      <span class="section-title">Mes commentaires</span>
      <span class="section-count">${comments.length}</span>
    </div>
    ${commentsHtml}
  </div>

  <!-- Badges -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">🏅</span>
      <span class="section-title">Mes badges</span>
      <span class="section-count">${badges.length}</span>
    </div>
    ${badgesHtml}
  </div>

  ${socialHtml}

  <!-- Footer -->
  <div class="footer">
    Export ODOS · ${esc(profile.email ?? '')} · Généré le ${formatDate(exportedAt)}<br/>
    Pour exercer vos droits (modification, suppression) : contact@odos-app.fr · www.cnil.fr
  </div>

</div>
</body>
</html>`;
}

function buildSocialHtml(social: ExportSocialData): string {
    const friendsList =
        social.friends.length === 0
            ? '<p class="empty">Aucun ami.</p>'
            : `<ul>${social.friends.map((f) => `<li>${esc(f.alias)} <span class="meta">depuis ${formatDate(f.since)}</span></li>`).join('')}</ul>`;

    const threadsList =
        social.forumThreads.length === 0
            ? '<p class="empty">Aucun fil créé.</p>'
            : social.forumThreads
                  .map(
                      (t) => `<div class="comment-item"><p class="comment-content"><strong>${esc(t.title)}</strong></p><p>${esc(t.content)}</p><p class="comment-meta">${formatDate(t.createdAt)}</p></div>`,
                  )
                  .join('');

    const sharesList =
        [...social.sharedActivitiesSent, ...social.sharedActivitiesReceived].length === 0
            ? '<p class="empty">Aucun partage.</p>'
            : `<ul>${[...social.sharedActivitiesSent, ...social.sharedActivitiesReceived]
                  .map((s) => `<li>${esc(s.activityName)} — ${esc(s.message) || 'sans message'} <span class="meta">${formatDate(s.createdAt)}</span></li>`)
                  .join('')}</ul>`;

    const groupsList =
        social.groups.length === 0
            ? '<p class="empty">Aucun groupe.</p>'
            : `<ul>${social.groups.map((g) => `<li>${esc(g.name)} <span class="meta">(${esc(g.role)}, ${formatDate(g.joinedAt)})</span></li>`).join('')}</ul>`;

    return `
  <div class="section">
    <div class="section-header">
      <span class="section-icon">👥</span>
      <span class="section-title">Communauté</span>
    </div>
    <p class="profile-label" style="margin-top:12px">Amis</p>
    ${friendsList}
    <p class="profile-label" style="margin-top:16px">Fils forum créés</p>
    ${threadsList}
    <p class="profile-label" style="margin-top:16px">Partages d'activités</p>
    ${sharesList}
    <p class="profile-label" style="margin-top:16px">Groupes</p>
    ${groupsList}
  </div>`;
}

export async function shareExportAsPdf(data: ExportData): Promise<void> {
    const html = buildHtml(data);

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const displayName = data.profile?.displayName ?? data.profile?.email ?? 'utilisateur';

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
        throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
    }

    await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Export de mes données ODOS — ${displayName}`,
        UTI: 'com.adobe.pdf',
    });
}
