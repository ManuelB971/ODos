import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Spacing } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

type SectionKey = 'cgu' | 'privacy' | 'mentions';

const SECTIONS: Record<SectionKey, { title: string; body: string }> = {
  cgu: {
    title: "Conditions générales d'utilisation",
    body: `Dernière mise à jour : mars 2026

1. Objet
Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile ODOS (ci-après « l'Application »).

2. Acceptation
En créant un compte ou en utilisant l'Application, vous acceptez sans réserve les présentes CGU.

3. Inscription
L'utilisateur doit fournir une adresse email valide et un mot de passe respectant les critères de sécurité définis. L'utilisateur est responsable de la confidentialité de ses identifiants.

4. Services proposés
ODOS permet de découvrir des activités culturelles, sportives et de loisirs. Les recommandations sont générées sur la base des centres d'intérêt déclarés par l'utilisateur.

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
    body: `Dernière mise à jour : mars 2026

1. Responsable du traitement
ODOS — application mobile de découverte d'activités.

2. Données collectées
- Adresse email (obligatoire pour la création de compte)
- Centres d'intérêt sélectionnés
- Activités ajoutées en favoris
- Alias et photo de profil (optionnels)

3. Finalités
Les données sont collectées pour :
- la gestion de votre compte utilisateur ;
- la personnalisation des recommandations d'activités ;
- l'amélioration de l'Application.

4. Base légale
Le traitement repose sur le consentement de l'utilisateur (création de compte) et l'exécution du service.

5. Conservation
Les données sont conservées tant que le compte est actif. En cas de suppression du compte, les données sont effacées dans un délai de 30 jours.

6. Droits de l'utilisateur
Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition.
- Export de vos données : Paramètres → « Télécharger mes données ».
- Suppression de compte : Paramètres → « Supprimer mon compte ».
Pour toute demande : contact@odos-app.fr

7. Stockages locaux (application mobile)
L'application stocke localement (SecureStore) les jetons d'authentification JWT et de rafraîchissement, nécessaires au maintien de session. Aucun cookie publicitaire n'est utilisé.

8. Sécurité
Les données sont protégées par des mesures techniques (chiffrement des mots de passe, tokens JWT, HTTPS).`,
  },
  mentions: {
    title: 'Mentions légales',
    body: `Dernière mise à jour : mars 2026

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
Icônes : Lucide Icons (licence ISC)
Photos : Unsplash (licence Unsplash)`,
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
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
