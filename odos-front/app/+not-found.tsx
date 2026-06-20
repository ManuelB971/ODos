import { Stack, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Compass } from 'lucide-react-native';

import { CTAButton } from '@/components/ui/CTAButton';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily, Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  const colors = useOdosColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Oups' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
          <Compass size={32} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text, fontFamily: FontFamily.accent }]}>
          On a perdu le chemin
        </Text>
        <Text style={[styles.body, { color: colors.muted, fontFamily: FontFamily.ui }]}>
          Cette page n&apos;existe pas (ou plus). Revenez à l&apos;accueil pour continuer la découverte.
        </Text>
        <CTAButton
          label="Retour à l'accueil"
          onPress={() => router.replace('/')}
          style={styles.cta}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 26, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  cta: { marginTop: 12, minWidth: 220 },
});
