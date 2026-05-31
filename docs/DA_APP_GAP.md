# Audit DA app mobile — checklist §10

Référence : [`DESIGN_DIRECTION.md`](DESIGN_DIRECTION.md) · Mai 2026

Ce document suit l’état **écran par écran** avant release. Mettre à jour à chaque itération DA.

---

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Conforme ou largement aligné |
| 🟡 | Partiel — écarts mineurs |
| ❌ | Non conforme / à traiter |

Critères §10 : fond `#FDF8F2` (clair), orange réservé aux accents/CTA, 3 polices dans leur rôle, spray/éditorial sur écrans clés, formes blob, photo/carte au premier plan, motion courte, pas de palette corporate/violet.

---

## Écrans audités

| Écran | Fond page | Typo DM/Cormorant | Spray / baseline | Orange usage | Statut |
|-------|-----------|-------------------|------------------|--------------|--------|
| **Splash** | ✅ `#FDF8F2` | ✅ | ✅ baseline multilingue | ✅ accents logo | ✅ |
| **Login** | ✅ | ✅ | ✅ | ✅ CTA + eyebrow | ✅ |
| **Interests (onboarding)** | ✅ | ✅ | ✅ | ✅ chips actifs | ✅ |
| **Home (tabs/index)** | ✅ | ✅ | 🟡 pas de spray (volontaire) | ✅ prix/CTA carte | 🟡 |
| **Search** | ✅ tokens | ✅ display + ui | ❌ | 🟡 chips | 🟡 |
| **Account** | 🟡 | 🟡 Fonts.serif partiel | ❌ | 🟡 | 🟡 |
| **Settings** | 🟡 | ❌ system | ❌ | 🟡 | ❌ |
| **Activity [id]** | 🟡 | 🟡 | ❌ | 🟡 | 🟡 |
| **Map** | N/A (carte) | 🟡 | ❌ halos blobs | ✅ pins palette | 🟡 |
| **Badges** | 🟡 | 🟡 | ❌ | 🟡 | 🟡 |
| **Legal** | 🟡 | 🟡 | ❌ | — | 🟡 |

---

## Composants transverses

| Composant | Statut | Notes |
|-----------|--------|-------|
| `constants/theme.ts` | ✅ | Tokens §2 centralisés |
| `CTAButton` | ✅ | Pill orange, DM Sans Bold |
| `SprayBackground` | ✅ | Texture atténuée |
| `SocialSignInButton` | ✅ | Guidelines Google/Apple |
| `InputField` | 🟡 | Vérifier focus bleu action vs orange |
| Mode sombre | ❌ | Tokens définis, UI non basculée |
| Motion fadeUp / stagger | ❌ | Splash seulement |
| Icônes blob (§4) | ❌ | Badges/onboarding steps carrés |
| Header blur (§6) | ❌ | Pas de barre verre native |

---

## OAuth social

| Élément | Statut |
|---------|--------|
| `POST /api/auth/google` | ✅ backend |
| `POST /api/auth/apple` | ✅ backend |
| Front `useSocialAuth` + AuthService | ✅ |
| Config prod `GOOGLE_OAUTH_CLIENT_IDS` | ❌ à renseigner VPS |
| Config prod `APPLE_CLIENT_ID` | ❌ à renseigner |
| Config EAS `EXPO_PUBLIC_GOOGLE_*` | ❌ à renseigner |
| Migration `google_id` / `apple_id` | ✅ — lancer en prod |

---

## Actions restantes (priorité release)

1. **Prod** — migrer DB + variables OAuth (Google Cloud + Apple Developer + `.env` VPS).
2. **Account / Settings / Activity / Badges** — appliquer `FontFamily` + `Colors.light.background`.
3. **Mode sombre** — hook thème + écrans principaux.
4. **Formes blob** — étapes onboarding, tuiles badges.
5. **Search** — option spray léger en header (facultatif).
6. **Motion** — `AccessibilityInfo` + reduced motion sur listes.

---

## Anti-patterns encore présents

- `#FFFFFF` comme fond de **page** sur certains écrans secondaires (acceptable sur cartes `elevated` uniquement).
- `fontWeight: 'bold'` sans `FontFamily` sur settings / activity.
- Search : ancienne palette bleu pâle remplacée par tokens — revoir contrastes chips si besoin.

---

*Dernière mise à jour : mai 2026 — après sprint splash / onboarding / home / OAuth.*
