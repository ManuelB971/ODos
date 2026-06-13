import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialTopTabs } from './_layout';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { postSocialConsent } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useQueryClient } from '@tanstack/react-query';

function SocialConsentGate({ children }: { children: React.ReactNode }) {
  const colors = useOdosColors();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !user.socialConsentedAt) {
      setVisible(true);
    }
  }, [user]);

  const accept = async () => {
    setLoading(true);
    try {
      const result = await postSocialConsent();
      if (user) {
        setUser({ ...user, socialConsentedAt: result.socialConsentedAt });
      }
      setVisible(false);
      queryClient.invalidateQueries();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text, fontFamily: FontFamily.serifSemiBold }]}>
              Communauté ODOS
            </Text>
            <Text style={[styles.body, { color: colors.muted, fontFamily: FontFamily.ui }]}>
              En utilisant les fonctionnalités communautaires, votre alias et avatar seront visibles par les autres utilisateurs.
            </Text>
            <Text style={[styles.body, { color: colors.muted, fontFamily: FontFamily.ui }]}>
              Vous pouvez désactiver la visibilité de votre profil dans les paramètres à tout moment.
            </Text>
            <Pressable
              onPress={accept}
              disabled={loading}
              style={[styles.cta, { backgroundColor: colors.accent }]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={[styles.ctaText, { color: colors.onAccent, fontFamily: FontFamily.uiMedium }]}>
                  J'accepte
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function CommunityLayout() {
  const colors = useOdosColors();
  usePushNotifications();

  return (
    <SocialConsentGate>
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarIndicatorStyle: { backgroundColor: colors.accent },
          tabBarLabelStyle: { fontFamily: FontFamily.uiMedium, fontSize: 13, textTransform: 'none' },
          tabBarStyle: { backgroundColor: colors.background },
        }}
      >
        <MaterialTopTabs.Screen name="forum" options={{ title: 'Forum' }} />
        <MaterialTopTabs.Screen name="friends" options={{ title: 'Amis' }} />
        <MaterialTopTabs.Screen name="messages" options={{ title: 'Messages' }} />
        <MaterialTopTabs.Screen name="groups" options={{ title: 'Groupes' }} />
      </MaterialTopTabs>
    </SocialConsentGate>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderRadius: 16, borderWidth: 1, padding: 24, gap: 12 },
  title: { fontSize: 22 },
  body: { fontSize: 14, lineHeight: 20 },
  cta: { marginTop: 8, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontSize: 15 },
});
