# Flows UX — Loi de Jakob (référence réutilisable)

Document opérationnel pour **concevoir, auditer et améliorer les parcours** de l’app ODOS.  
Complète [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) (DA / tokens) et [`DA_APP_GAP.md`](DA_APP_GAP.md) (conformité écran par écran).

**Dernière révision :** juin 2026

---

## 1. La loi de Jakob (rappel)

> *Les utilisateurs passent la majeure partie de leur temps sur **d’autres** applications. Ils préfèrent que la vôtre fonctionne **comme celles qu’ils connaissent déjà**.*

— Jakob Nielsen, NN/g

### Ce que ça implique (et ce que ce n’est pas)

| ✅ Oui | ❌ Non |
|--------|--------|
| Réutiliser des **schémas mentaux** éprouvés (tabs, retour, recherche, liste → détail) | Copier pixel par pixel Instagram ou Google Maps |
| Placer les actions là où l’utilisateur **s’attend** à les trouver | Inventer une navigation « créative » sans légende |
| Réduire l’**effort d’apprentissage** à chaque nouvel écran | Sacrifier l’accessibilité ou la DA ODOS au nom du conformisme |
| Tester avec la question : *« Où irais-je sur une autre app ? »* | Ajouter des étapes « parce que c’est joli » |

**Posture ODOS :** chaleur éditoriale et identité visuelle **dans** des flows familiers — pas **à la place** de flows familiers.

---

## 2. Modèles mentaux de référence

Lors d’un nouveau flow, identifier **1 à 2 apps de référence** que l’utilisateur cible utilise déjà.

| Domaine ODOS | Références courantes | Attente utilisateur |
|--------------|----------------------|---------------------|
| **Découverte locale** | Google Maps, TheFork, TripAdvisor | Carte + liste, filtre, fiche lieu, « Y aller » |
| **Accueil / feed** | Instagram, Pinterest, Airbnb | Scroll vertical, cartes image-first, CTA secondaire discret |
| **Recherche** | Spotify, Airbnb | Champ en haut, chips catégorie, résultats immédiats |
| **Favoris** | toute app e-commerce / média | Cœur toggle, liste dédiée, état vide explicite |
| **Compte / réglages** | iOS Réglages, Instagram | Avatar + nom en tête, sections groupées, danger zone en bas |
| **Social / amis** | Instagram, WhatsApp, Discord | Recherche par pseudo, demandes en attente, chat 1-to-1 |
| **Groupes** | WhatsApp, Facebook Groups | Liste → détail → membres / messages |
| **Forum** | Reddit, Discourse | Threads, réponses imbriquées, signalement |
| **Auth** | apps bancaires / grand public | Email + mot de passe, oublier MDP, OAuth en bas |

**Règle :** si ODOS s’écarte d’un modèle (ex. pas de bouton retour visible, action principale cachée dans un menu), **documenter pourquoi** dans la fiche fonctionnalité.

---

## 3. Principes dérivés (checklist rapide)

Avant de valider un flow, vérifier les **7 principes Jakob × ODOS** :

1. **Cohérence interne** — Même action = même place, même libellé, même icône sur tous les écrans (ex. « Partager » toujours sur la fiche activité, pas ailleurs).
2. **Hiérarchie standard** — Primaire (1 CTA orange), secondaire (lien / outline), tertiaire (icône header). Pas plus d’un CTA primaire par zone.
3. **Navigation prévisible** — Tabs = destinations racine ; stack = détail ; modal = tâche courte ou consentement.
4. **Feedback immédiat** — Loading, succès, erreur, empty state : jamais un écran vide sans explication.
5. **Progressive disclosure** — Montrer le minimum pour avancer ; options avancées dans Paramètres.
6. **Reconnaissance > rappel** — Labels explicites (« Ajouter en ami ») plutôt que symboles seuls sans légende.
7. **Sortie facile** — Retour, annuler, fermer modal, refuser consentement sans piège.

---

## 4. Patterns de flow recommandés (ODOS)

### 4.1 Navigation racine

```
[Tabs] Accueil | Recherche | **Parcours** (centre) | Communauté | Compte
         ↓ stack          ↓ stack        ↓ stack         ↓ stack      ↓ stack
      /activity/:id    /map (modal)   /parcours/:id   /profile/:id  /settings
```

- **Jakob :** 4–5 onglets max, icône + label court, état actif visible (couleur `blue.action` ou accent thème).
- **ODOS :** onglet **Parcours** central proéminent (CTA orange) ; **Favoris** accessibles via Compte (href masqué dans la tab bar). Ne pas imbriquer une deuxième barre d’onglets sans titre de section clair (ex. Communauté : Forum | Amis | Messages | Groupes — OK si l’utilisateur comprend qu’il est dans « Communauté »).

### 4.2 Liste → détail → action

Schéma universel pour activités, amis, groupes, threads :

```
Liste (aperçu)  →  tap  →  Détail (contexte complet)  →  CTA (favori, noter, partager, message)
```

- Image / carte en hero sur le détail (photo-first, cf. DA).
- CTA sticky en bas pour l’action géographique (« Y aller ») — comme Maps / Waze.

### 4.3 Recherche & découverte sociale

Schéma attendu (type Instagram / Discord) :

```
Champ recherche (≥ 2 car.)  →  résultats live  →  action contextuelle (Ajouter | Message | Profil)
```

**Points Jakob pour ODOS Communauté :**

| Élément | Emplacement attendu | État actuel / cible |
|---------|---------------------|---------------------|
| Chercher un utilisateur | Haut de l’onglet Amis | ✅ `UserSearchBar` |
| Demandes reçues | Au-dessus de la liste d’amis | ✅ section « Demandes » |
| Voir le profil | Tap sur la ligne | ✅ `/profile/:id` |
| Passer en privé | Paramètres → Confidentialité | ✅ toggle `profilePublic` + bannière de rappel dans l'onglet Amis |
| Consentement social | Une fois, modal bloquante explicite | ✅ avec texte RGPD |

### 4.4 Consentements & permissions

Ordre **familier** (comme iOS / apps santé) :

1. **Expliquer** pourquoi (1–3 phrases).
2. **Montrer** le bénéfice utilisateur.
3. **Bouton principal** = accepter ; secondaire = plus tard / refuser.
4. **Ne pas** demander GPS + social + notifications dans la même modal.

Flows ODOS : exploration carte (GPS), consentement Communauté, notifications push — **3 moments distincts**.

### 4.5 États vides (empty states)

Chaque liste vide doit répondre à : *Pourquoi c’est vide ?* + *Que faire ?*

| Écran | Message type Jakob | Action |
|-------|-------------------|--------|
| Favoris vides | « Aucun favori pour l’instant » | Lien → Recherche |
| Reco vides | « Choisissez vos centres d’intérêt » | Lien → Intérêts |
| Amis vides | « Trouvez des voyageurs par alias » | Focus champ recherche |
| Messages vides | « Démarrez une conversation depuis un ami » | Lien → Amis |

Ton ODOS : une touche Courgette **optionnelle** sur la ligne d’encouragement, pas un paragraphe poétique.

---

## 5. Anti-patterns (à éviter)

| Anti-pattern | Pourquoi ça viole Jakob | Exemple à éviter |
|--------------|-------------------------|------------------|
| **Action unique cachée** | L’utilisateur ne devine pas le geste | Partager seulement via long-press |
| **Double navigation** | Deux barres de tabs sans repère | Tabs + tabs sans titre « Communauté » |
| **Terminologie instable** | Casse la reconnaissance | « Amis » / « Contacts » / « Réseau » pour la même chose |
| **Recherche sans résultat expliqué** | Frustration, abandon | Liste vide sans « Aucun utilisateur — vérifiez l’alias » |
| **Prérequis implicites** | L’utilisateur ne sait pas qu’il a raté une étape | Comptes non trouvables sans consentement Communauté |
| **Carte lourde dans un scroll** | Maps / Airbnb séparent preview et carte plein écran | MapLibre animée dans le header d’accueil |
| **Retour absent** | Violation la plus courante sur Android | Écran stack sans flèche ni gesture back |

---

## 6. Grille d’audit réutilisable (par écran ou feature)

Copier ce bloc dans une PR, une fiche `docs/fonctionnalites/`, ou un ticket design.

```markdown
## Audit flow — [Nom écran / feature]

**Référence Jakob :** [ex. « Comme WhatsApp pour la liste de conversations »]  
**Parcours :** [point d’entrée] → [étapes] → [sortie / succès]

### Familiarité
- [ ] L’utilisateur sait où il est (titre, tab actif, fil d’Ariane mental)
- [ ] Le retour / fermeture est évident
- [ ] Les libellés correspondent au vocabulaire du reste de l’app

### Efficacité
- [ ] Objectif atteignable en ≤ N taps depuis l’onglet racine (préciser N)
- [ ] Pas d’étape redondante (consentement, login déjà fait)
- [ ] Chargement et erreurs gérés sans écran blanc

### Cohérence ODOS
- [ ] Tokens DA respectés (cf. DESIGN_DIRECTION.md §2–3)
- [ ] Un seul CTA primaire orange par zone
- [ ] Empty state avec action suivante

### Écarts assumés
| Écart par rapport au modèle de référence | Justification |
|----------------------------------------|---------------|
| … | … |

### Verdict
- [ ] ✅ Ship — flow familier
- [ ] 🟡 Itérer — écart mineur documenté
- [ ] ❌ Repenser — effort d’apprentissage trop élevé
```

---

## 7. Matrice rapide — flows ODOS (juin 2026)

À mettre à jour à chaque release. Légende : ✅ familier · 🟡 écart mineur · ❌ à repenser

| Flow | Modèle de référence | Verdict | Note Jakob |
|------|---------------------|---------|------------|
| Onboarding login / intérêts | Apps grand public | ✅ | Classique email + chips intérêts |
| Accueil → fiche activité | Airbnb / TripAdvisor | ✅ | Carte → liste → détail |
| Recherche browse | Spotify chips | ✅ | Chips + grille |
| Carte plein écran `/map` | Google Maps | ✅ | Pins, callout, recentrer |
| Favoris + visité | e-commerce | ✅ | Toggle cœur / check |
| Communauté → Amis | Instagram | ✅ | Recherche + bannière découvrabilité si profil privé ; empty state explicite |
| Communauté → Messages | WhatsApp | ✅ | Liste conv. → chat ; empty state Mosaïque pop |
| Chat 1-to-1 | WhatsApp | ✅ | Header + retour + titre interlocuteur, `KeyboardAvoidingView`, auto-scroll, horodatage + « Lu / Envoyé », empty state ; **avatars d'interlocuteur** (dernier d'un groupe) ; **cartes riches activité + parcours** dans la bulle |
| Communauté → Groupes | WhatsApp groups | ✅ | En-tête Créer/Invitations + onglets en Mosaïque pop ; empty state avec CTA |
| Communauté → Forum | Reddit / Discourse | ✅ | Création de sujet (CTA + écran avec catégorie), réponse, like câblés ; empty state avec CTA |
| Forum → Thread détail | Reddit | ✅ | Header + retour, composer de réponse (clavier), like optimiste, empty state réponses, fil verrouillé géré |
| Profil public | Instagram | ✅ | Modal avec header/fermer + actions contextuelles (Ajouter / Accepter / Message selon la relation) |
| Partage activité | Maps share | ✅ | Modal amis + groupes (boîte « Partages reçus ») **+ carte riche directement dans le fil de chat** (bouton « + » du composer) |
| Parcours (itinéraire) | Google Maps trajets | ✅ | Onglet **Parcours** central ; « Ajouter à un parcours » ; `parcours/[id]` ; partage multi-cibles ; co-édition **sur invitation explicite** |
| Paramètres compte | iOS Settings | ✅ | Section Confidentialité (toggle profil visible) ajoutée |
| Badges débloqués | jeux mobile | ✅ | Modal célébration + fermer |

---

## 7.1 Audit Communauté — juin 2026

Audit ciblé de l’onglet **Communauté** (Forum / Amis / Messages / Groupes + écrans de détail), pondération motion **Jakub primaire · Emil secondaire · Jhey sélectif** (app mobile, cf. design-motion-principles).

### ✅ Corrigé pendant cette itération

| Domaine | Avant | Après |
|---------|-------|-------|
| Confidentialité | Aucun moyen de se mettre public / privé | Toggle `profilePublic` (Paramètres) + bannière « Rendre public » dans l’onglet Amis |
| Découvrabilité | Recherche muette quand 0 résultat | Empty-state explicite : « Seuls les profils publics ayant rejoint la Communauté apparaissent » |
| Empty states | Texte gris isolé (Amis, Messages, Groupes, Forum) | `PopEmptyState` unifié (icône encre, titre serif, CTA), entrée animée `prefers-reduced-motion`-safe |
| Groupes | En-tête / onglets hors DA | En-tête Créer/Invitations + onglets en Mosaïque pop, CTA création |
| **Retour absent** (anti-pattern §5) | `chat/[id]`, `thread/[id]` sans header ni retour ; `profile/[id]` modal sans fermer | Header + retour ajoutés sur les 3 ; chat : `KeyboardAvoidingView` + auto-scroll + horodatage + « Lu / Envoyé » + empty state |

### 🎬 Motion & accessibilité

- **Aucun AI-slop détecté** : pas de `pulse`/`glow`/`breathe`, pas de stagger sur les listes, pas de spring « bouncy » sur des actions utilitaires. ✅
- `PopEmptyState` est la seule entrée animée ajoutée — `FadeInDown` ~380 ms, **désactivée si `prefers-reduced-motion`** (fréquence « rare » → un peu de chaleur justifiée, lens Jhey/Jakub).
- Press-state Mosaïque pop déjà présent sur `PopListItem` / `ThreadCard` ; **absent** sur `FriendCard` / `GroupCard` / lignes Messages (opportunité polish Jakub : translate 1.5 px au press).

### ✅ Backlog traité (itération 2)

| Prio | Écran | Constat (loi de Jakob) | Livré |
|------|-------|------------------------|-------|
| 🔴 P1 | **Forum** | Modèle Reddit/Discourse mais **non-participatif**. | API + `useForumMutations` câblés ; écran `thread/create` (titre + catégorie + message) ; composer de réponse (`KeyboardAvoidingView`) ; like optimiste (Emil : pas d'attente). |
| 🔴 P1 | **Forum (liste)** | Empty-state sans action ; pas de CTA « Nouveau sujet ». | CTA « Nouveau sujet » en en-tête + CTA branché sur l'empty-state. |
| 🟡 P2 | **Profil public** | Cul-de-sac (ni ajouter, ni message). | Boutons contextuels selon la relation : Ajouter / Accepter / Demande envoyée / Message. |
| 🟡 P2 | **Thread détail** | Pas d'empty-state réponses. | `PopEmptyState` « Aucune réponse — soyez le premier ». |
| 🟢 P3 | Amis / Groupes / Messages | Pas de feedback de press en pop ; demandes sans animation de sortie. | Press translate/opacity ; `FadeIn/FadeOut` sur les demandes d'ami (gated reduced-motion). |

### 🔧 Reste à faire (prochaine itération)

| Prio | Écran | Reste |
|------|-------|-------|
| 🟢 P3 | Chat | Séparateurs de date par jour ; indicateur « en train d'écrire ». |
| 🟢 P3 | Forum | Suppression de son propre sujet / réponse (API back prête : `DELETE`). |
| 🟢 P4 | Groupes | Audit dédié de `group/[id]` (membres, quitter, inviter) non couvert ici. |

---

## 7.2 Partage en chat & Parcours — juin 2026 (itération 3)

> **Note :** l’itération 4 (§7.3) complète et corrige certains points ci-dessous (onglet Parcours, pochette, visibilité, partage sans co-édition automatique, blocage).

Réponse à deux besoins utilisateur : *« dans les chats on peut partager une activité (carte + bouton) et constituer des parcours »* et *« comme WhatsApp, voir les photos de profil dans le chat »*. Pondération motion **Jakub primaire · Emil secondaire** (optimiste partout, pas d'attente).

### ✅ Livré

| Domaine | Modèle de référence | Livré |
|---------|---------------------|-------|
| **Avatars dans le chat** | WhatsApp | Avatar de l'interlocuteur à gauche du **dernier message d'un groupe consécutif** (espace réservé sinon pour aligner), repli initiales, bordure encre en Mosaïque pop. |
| **Partage activité in-chat** | WhatsApp (carte lien) | Bouton « + » dans le composer → `ActivityPickerSheet` (favoris + recherche live) → **carte riche** (photo + nom + ville) dans la bulle, tap → fiche. Backend : `ChatMessage.activity` (FK SET NULL), message texte-OU-pièce-jointe. |
| **Parcours — construction** | Google Maps « listes / trajets » | Modèle **playlist contextuel** (pas de nouvel onglet, choix utilisateur) : « Ajouter à un parcours » (icône `Route`) sur la fiche activité + sur la carte d'activité partagée → `ParcoursPickerSheet`. Écran `parcours/[id]` : étapes ordonnées, réordonner (↑/↓, optimiste), retirer, renommer. |
| **Parcours — carte** | Google Maps directions | `ParcoursRouteLayer` : `LineString` reliant les étapes (couche GL native, repli stub Expo Go/web) + pins numérotés. |
| **Parcours — partage & collaboration** | — | Bouton « Partager » → `ConversationPickerSheet` → carte parcours dans le chat ; **partager ajoute le destinataire en collaborateur** (édition à plusieurs, choix utilisateur). Backend : `Parcours` / `ParcoursItem` / `ParcoursCollaborator`, accès = propriétaire OU collaborateur. |

### 🎬 Motion & accessibilité

- **Aucun AI-slop** : pas de `pulse`/`glow`, pas de stagger ; reorder de parcours **optimiste** (Emil : feedback immédiat), like/partage sans spinner bloquant.
- Cartes activité/parcours = `Pressable` simple → navigation ; pas d'animation gratuite.
- Empty state parcours via `PopEmptyState` (cohérent itération 1, `prefers-reduced-motion`-safe).

### 🔧 Reste à faire

| Prio | Écran | Reste |
|------|-------|-------|
| 🟢 P3 | Parcours | Note par étape (champ `note` existant côté API, pas encore éditable en UI) ; `coverImageUrl` non calculé dans la carte de chat (icône `Route` à la place). |
| 🟢 P3 | Parcours | Drag-to-reorder (actuellement ↑/↓) ; suppression d'un parcours (API `DELETE` prête, pas de bouton UI). |
| 🟡 — | Backend | Tests unitaires `ChatService`/`ParcoursService`/`FriendshipService` à compléter. |

---

## 7.3 Parcours onglet, social & blocage — juin 2026 (itération 4)

Réponse aux besoins : *« bibliothèque de parcours visible »*, *« partager vers amis / groupes / forum »*, *« bloquer un utilisateur »*, *« pièces jointes dans le chat de groupe »*.

### ✅ Livré

| Domaine | Modèle de référence | Livré |
|---------|---------------------|-------|
| **Onglet Parcours** | Spotify playlists / Google Maps listes | Tab central proéminent ; `app/(tabs)/parcours.tsx` ; accès rapide depuis fiche activité |
| **Pochette & visibilité** | Spotify cover / playlist privée | Upload `POST …/cover` ; `visibility` public/private ; migration `Version20260620120000` |
| **Partage multi-cibles** | WhatsApp forward | `ParcoursShareTargetSheet` : ami, groupe, forum ; cartes riches chat privé **et** groupe |
| **Collaboration explicite** | Google Docs invite | Partage chat **n’ajoute plus** le destinataire en collaborateur ; invitation via `POST …/collaborators` |
| **Blocage utilisateur** | Instagram / Discord block | `POST/DELETE /api/users/{id}/block` ; masque profil ; supprime conversation ; révoque co-édition parcours mutuelle |
| **Profil public** | Instagram discoverability | Interrupteur `profilePublic` en Paramètres ; recherche amis filtrée |
| **Avatars unifiés** | WhatsApp | `UserAvatar` + `UserLink` partagés (chat, forum, profils) |
| **Group chat attachments** | WhatsApp | `group_message.activity_id` / `parcours_id` ; `MessageAttachmentCards` |

### ✅ Backlog traité (itération 5 — 2026-06-20)

| Domaine | Livré |
|---------|-------|
| **Modération UGC** | Signalement étendu hors forum (`ContentReport`) : messages privés / de groupe / commentaires / profils, + EasyAdmin dédié |
| **A11y & confiance** | Fix persistance variant thème, `InputField` labels SR, consent « Plus tard », `+not-found` FR, empty states + CTA, erreur + retry, tab 44 pt, `HapticTab` + haptics |
| **DA / système** | `#E0245E` cœur favori → `colors.danger` ; suppression `styles.ts` legacy ; fond pop `messages.tsx` ; `useMotionConfig` reduced-motion |
| **Navigation** | Routage des taps de notification (`useNotificationResponse`) |

### 🔧 Reste à faire

| Prio | Écran | Reste |
|------|-------|-------|
| 🟢 P3 | Parcours | Note par étape (API prête) ; drag-to-reorder ; bouton suppression parcours |
| 🟢 P3 | Chat | Séparateurs de date ; indicateur « en train d'écrire » |
| 🟢 P3 | Forum | Suppression de son propre sujet / réponse (API `DELETE` prête) |
| 🟡 P2 | DA | Migrer le reste des CTAs custom → `CTAButton` ; extraire `ThemedScreen` (voir [AUDIT_UI_UX_FRONT.md](AUDIT_UI_UX_FRONT.md) §14) |

Fiches détaillées : [fonctionnalites/parcours.md](fonctionnalites/parcours.md) · [fonctionnalites/communaute-sociale.md](fonctionnalites/communaute-sociale.md).

---

## 8. Processus d’amélioration (à répéter)

1. **Choisir** un flow à améliorer (métrique : abandon, support, test utilisateur).
2. **Nommer** l’app de référence (§2).
3. **Tracer** le flow actuel vs attendu (5–8 boîtes max).
4. **Remplir** la grille d’audit (§6).
5. **Prioriser** : d’abord familiarité / clarté, ensuite polish DA (Mosaïque pop, motion).
6. **Documenter** les écarts assumés dans la fiche `docs/fonctionnalites/`.
7. **Re-auditer** après implémentation (mettre à jour §7).

---

## 9. Liens

| Document | Rôle |
|----------|------|
| [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) | Tokens, typo, composants DA |
| [AUDIT_UI_UX_FRONT.md](AUDIT_UI_UX_FRONT.md) | Audit UI/UX fusionné (Pro Max × Jakob, thèmes, engagement) |
| [AUDIT_UI_UX_FRONT.md](AUDIT_UI_UX_FRONT.md) | Audit V1 (revue code détaillée) |
| [DA_APP_GAP.md](DA_APP_GAP.md) | Conformité visuelle écran par écran |
| [fonctionnalites/README.md](fonctionnalites/README.md) | Fiches produit par domaine |
| [fonctionnalites/parcours.md](fonctionnalites/parcours.md) | Itinéraires collaboratifs |
| [fonctionnalites/communaute-sociale.md](fonctionnalites/communaute-sociale.md) | Forum, amis, chat, blocage |
| [IDEES_POTENTIELLES.md](IDEES_POTENTIELLES.md) | Backlog idées (hors scope Jakob) |

---

## 10. Références externes

- [Jakob’s Law (NN/g)](https://www.nngroup.com/videos/jakobs-law/) — vidéo fondatrice  
- [10 Usability Heuristics (NN/g)](https://www.nngroup.com/articles/ten-usability-heuristics/) — complément naturel à la loi de Jakob  
- [Match Between the System and the Real World](https://www.nngroup.com/articles/match-system-real-world/) — heuristique #2, alignée vocabulaire & métaphores

---

*Ce document est volontairement réutilisable : copier §6 dans un ticket, §7 dans un sprint review, §4 lors de la conception d’un nouvel onglet ou module social.*
