import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';

type SectionKey = 'cgu' | 'privacy' | 'mentions';

const SECTIONS: Record<SectionKey, { title: string; body: string }> = {
  cgu: {
    title: "Conditions générales d'utilisation",
    body: `Dernière mise à jour : juin 2026

1. Objet
Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile ODOS (ci-après « l'Application »).

2. Acceptation
En créant un compte ou en utilisant l'Application, vous acceptez sans réserve les présentes CGU.

3. Inscription
L'utilisateur doit fournir une adresse email valide et un mot de passe respectant les critères de sécurité définis. L'utilisateur est responsable de la confidentialité de ses identifiants.

4. Services proposés
ODOS permet de découvrir des activités culturelles, sportives et de loisirs.

Les recommandations sont personnalisées selon deux mécanismes :
a) Filtrage par centres d'intérêt déclarés.
b) Filtrage collaboratif : les lieux que vous marquez en favori ou que vous signalez comme visités (bouton « J'ai visité ce lieu ») sont croisés avec les signaux d'autres utilisateurs afin d'améliorer la pertinence des suggestions.

Le signal « J'ai visité » est un marquage volontaire et réversible à tout moment. Il ne collecte aucune donnée GPS de localisation de l'utilisateur.

5. Responsabilité
L'éditeur ne saurait être tenu responsable de l'exactitude des informations relatives aux activités listées. Les activités sont fournies à titre informatif.

6. Propriété intellectuelle
L'ensemble des contenus (textes, images, logos) de l'Application est protégé par le droit de la propriété intellectuelle.

7. Modification des CGU
L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. L'utilisateur sera informé de toute modification.

8. Droit applicable
Les présentes CGU sont régies par le droit français. Tout litige relève de la compétence des tribunaux de Lyon.`,
  },
  privacy: {
    title: 'Politique de confidentialité',
    body: `Dernière mise à jour : octobre 2026

1. Responsable du traitement
ODOS — application de découverte d'activités (mobile et web).
Contact : contact@odos-app.fr

2. Données collectées
Toujours (nécessaires au compte) :
- Adresse email, mot de passe (stocké chiffré), date d'acceptation des CGU
- Centres d'intérêt et ville de référence
- Activités ajoutées en favoris ou marquées comme visitées (bouton « J'ai visité ce lieu »)
- Données techniques : adresse IP et requêtes dans les journaux du serveur

Seulement si vous les fournissez ou activez la fonction :
- Alias, bio et photo de profil
- Notes et commentaires sur les activités
- Communauté (après votre accord) : sujets et réponses du forum, demandes d'amis, messages privés, groupes, parcours partagés, blocages et signalements
- Exploration de la carte (après votre accord) : zones approximatives visitées, voir l'article 3
- Notifications : identifiant technique de l'appareil (jeton push)

3. Géolocalisation (exploration de la carte)
L'exploration est désactivée par défaut et facultative : l'application fonctionne sans.
- Elle n'est utilisée qu'avec votre accord explicite, demandé à l'ouverture de la carte, puis l'autorisation de position de votre téléphone ou navigateur. Vous pouvez refuser l'une ou l'autre sans perdre l'accès à l'application.
- Votre position n'est lue que lorsque la carte est ouverte au premier plan, jamais en arrière-plan.
- Vos coordonnées GPS ne quittent pas votre appareil : il les convertit en zones d'environ 1 km × 600 m (geohash de précision 6). Seules les zones qui contiennent une activité ODOS sont enregistrées, avec la date de première visite. Aucun trajet ni historique horodaté n'est conservé.
- Finalité : calculer votre pourcentage de zones explorées et débloquer des badges.
- Ces zones ne sont visibles que par vous. Elles ne sont jamais partagées avec vos amis, vos groupes ou la communauté.
- Retrait : Paramètres → « Exploration de la carte ». Désactiver retire votre accord et efface immédiatement vos zones visitées (les badges déjà obtenus sont conservés).
Le bouton « J'ai visité ce lieu » est un marquage manuel : il n'utilise pas votre position.

4. Finalités et bases légales
- Compte, favoris, visites, recommandations : exécution du service (contrat).
- Recommandations par filtrage collaboratif : les activités favorites ou visitées sont recoupées avec celles d'autres utilisateurs à partir d'identifiants internes, sans votre email (contrat).
- Communauté, exploration de la carte, notifications : votre consentement, que vous pouvez retirer à tout moment.
- Sécurité, prévention des abus, journaux du serveur : intérêt légitime.

5. Durées de conservation
- Compte et contenus : tant que le compte est actif ; effacement sous 30 jours après la suppression du compte (les commentaires publics sont anonymisés).
- Zones d'exploration : jusqu'au retrait de votre accord ou à la suppression du compte.
- Session : jeton d'accès 15 minutes, jeton de rafraîchissement 30 jours.
- Journaux du serveur : 30 jours (accès) à 90 jours (erreurs et application).

6. Destinataires et sous-traitants
Vos données ne sont ni vendues ni utilisées pour de la publicité.
- Hébergement de l'API et des données : Contabo GmbH (Allemagne, Union européenne).
- Fonds de carte : OpenFreeMap (thème clair) et CARTO (thème sombre) servent les images de la carte. Ils reçoivent votre adresse IP et la zone affichée à l'écran, comme pour toute carte en ligne, mais jamais votre position GPS ni votre identité ODOS.
- Notifications push : Expo (650 Industries, États-Unis), puis Apple ou Google, acheminent les notifications à partir du jeton de l'appareil. Ce transfert hors de l'Union européenne repose sur le cadre de protection des données UE–États-Unis ou sur des clauses contractuelles types.
- Recommandations par IA : modèle de langage auto-hébergé, sans transfert à un tiers (voir l'article 9).

7. Vos droits
Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition, et du droit de retirer votre consentement à tout moment.
- Export de vos données (art. 20) : Paramètres → « Exporter mes données en PDF » (profil, favoris, visites, zones d'exploration, commentaires, notes, badges).
- Suppression de compte (art. 17) : Paramètres → « Supprimer mon compte ».
- Exploration de la carte : Paramètres → désactiver, ce qui efface vos zones visitées.
- Signal « J'ai visité » : réversible depuis la fiche de l'activité.
Pour toute demande : contact@odos-app.fr. Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr/fr/plaintes).

8. Stockages locaux
Application mobile : les jetons de session sont conservés dans le stockage sécurisé du téléphone (SecureStore). Version web : ils sont conservés dans le stockage local du navigateur (localStorage), avec, si l'exploration est active, la liste des zones en attente d'envoi. Ces stockages sont nécessaires au fonctionnement ; aucun cookie publicitaire ni traceur de mesure d'audience n'est utilisé.

9. Recommandations par intelligence artificielle
Les recommandations peuvent être affinées par un modèle de langage (LLM) auto-hébergé. Ce modèle reçoit uniquement vos centres d'intérêt et des métadonnées d'activités (nom, catégorie, ville), jamais votre email, votre identité ni votre position. Le résultat est mis en cache et n'est pas partagé avec des tiers.

10. Sécurité
Les données sont protégées par des mesures techniques : chiffrement des mots de passe (Argon2/bcrypt), jetons de session à durée limitée, transport HTTPS, limitation du nombre de requêtes.`,
  },
  mentions: {
    title: 'Mentions légales',
    body: `Dernière mise à jour : juin 2026

1. Éditeur de l'application
ODOS
Application mobile de découverte d'activités
Email de contact : contact@odos-app.fr

2. Hébergement
Les données sont hébergées par Contabo GmbH — Aschauer Straße 32a, 81549 München, Allemagne (https://contabo.com).

3. Directeur de la publication
Manuel — contact@odos-app.fr

4. Propriété intellectuelle
L'Application ODOS et l'ensemble de ses contenus sont protégés par les lois relatives à la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation préalable.

5. Crédits
Icônes UI : Material Icons (Google, licence Apache 2.0) · Lucide Icons (licence ISC)
Photos : Unsplash (licence Unsplash)
Cartographie : MapLibre GL (licence BSD-2-Clause)`,
  },
};

const DEFAULT_SECTION: SectionKey = 'cgu';

export default function LegalScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { section } = useLocalSearchParams<{ section?: string }>();
  const key = (SECTIONS[section as SectionKey] ? section : DEFAULT_SECTION) as SectionKey;
  const { title, body } = SECTIONS[key];

  return (
    <View style={styles.screen}>
      <ResponsiveShell bar>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
        >
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      </ResponsiveShell>

      <ResponsiveShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
      </ResponsiveShell>
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 48,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
  },
});
}
