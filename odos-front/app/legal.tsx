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
    body: `Dernière mise à jour : juin 2026

1. Responsable du traitement
ODOS — application mobile de découverte d'activités.
Contact : contact@odos-app.fr

2. Données collectées
- Adresse email (obligatoire pour la création de compte)
- Centres d'intérêt sélectionnés (catégories d'activités)
- Activités ajoutées en favoris
- Activités marquées comme visitées (bouton « J'ai visité ce lieu »)
- Alias et photo de profil (optionnels)
- Notes et commentaires sur les activités (optionnels)

3. Finalités
Les données sont collectées pour :
- la gestion de votre compte utilisateur ;
- la personnalisation des recommandations d'activités par filtrage sur vos centres d'intérêt ;
- l'amélioration des recommandations par filtrage collaboratif : les activités que vous favorisez ou marquez comme visitées sont recoupées, de manière anonymisée, avec les données d'autres utilisateurs pour identifier des suggestions pertinentes ;
- l'amélioration continue de l'Application.

Le filtrage collaboratif n'utilise pas votre identité directe (email) : seuls les identifiants internes d'activités sont croisés entre utilisateurs.

4. Base légale
Le traitement repose sur le consentement de l'utilisateur (création de compte) et l'exécution du service (personnalisation des recommandations).

5. Conservation
Les données sont conservées tant que le compte est actif. En cas de suppression du compte, les données personnelles sont effacées dans un délai de 30 jours. Les signaux de visites et favoris sont supprimés en cascade avec le compte.

6. Droits de l'utilisateur
Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition.
- Export de vos données (art. 20) : Paramètres → « Exporter mes données en PDF ». L'export génère un PDF lisible contenant votre profil, favoris, visites, commentaires, notes et badges.
- Suppression de compte (art. 17) : Paramètres → « Supprimer mon compte ».
- Révocation d'un signal : le bouton « J'ai visité » est réversible à tout moment depuis la fiche de l'activité.
Pour toute demande : contact@odos-app.fr

7. Stockages locaux (application mobile)
L'application stocke localement (SecureStore) les jetons d'authentification JWT et de rafraîchissement, nécessaires au maintien de session. Aucun cookie publicitaire n'est utilisé.

8. Recommandations par intelligence artificielle
Les recommandations peuvent être affinées par un modèle de langage (LLM) auto-hébergé. Ce modèle reçoit uniquement vos centres d'intérêt et des métadonnées d'activités (nom, catégorie, ville) — jamais votre email ni votre identité. Le résultat est mis en cache et non partagé avec des tiers.

9. Sécurité
Les données sont protégées par des mesures techniques : chiffrement des mots de passe (Argon2/bcrypt), tokens JWT à durée limitée, transport HTTPS, rate limiting.`,
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
