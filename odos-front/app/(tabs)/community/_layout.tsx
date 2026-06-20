import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { postSocialConsent } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { CONVERSATIONS_QUERY_KEY } from '@/hooks/useChat';
import { FRIENDSHIPS_QUERY_KEY } from '@/hooks/useFriendships';
import { SOCIAL_UNREAD_QUERY_KEY } from '@/hooks/useSocialUnreadCount';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { SafeAreaView } from 'react-native-safe-area-context';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

function SocialConsentGate({ children }: { children: React.ReactNode }) {
  const colors = useOdosColors();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !user.socialConsentedAt) {
      setVisible(true);
    } else {
      setVisible(false);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: FRIENDSHIPS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['forumThreads'] }),
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['chatMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['sharedActivities'] }),
        queryClient.invalidateQueries({ queryKey: ['userSearch'] }),
        queryClient.invalidateQueries({ queryKey: SOCIAL_UNREAD_QUERY_KEY }),
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          accessibilityViewIsModal
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text, fontFamily: FontFamily.display }]}>
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
              accessibilityRole="button"
              accessibilityLabel="J'accepte et rejoins la communaut\u00e9"
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={[styles.ctaText, { color: colors.onAccent, fontFamily: FontFamily.uiMedium }]}>
                  {"J\u2019accepte"}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => setVisible(false)}
              disabled={loading}
              style={styles.laterBtn}
              accessibilityRole="button"
              accessibilityLabel="Plus tard, parcourir sans rejoindre la communaut\u00e9"
            >
              <Text style={[styles.laterText, { color: colors.muted, fontFamily: FontFamily.uiMedium }]}>
                Plus tard
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function CommunityLayout() {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  usePushNotifications();

  return (
    <SocialConsentGate>
      <SafeAreaView
        edges={['top']}
        style={{ flex: 1, backgroundColor: isMosaicPop ? pop.paper : colors.background }}
      >
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: isMosaicPop ? pop.ink : colors.accent,
          tabBarInactiveTintColor: isMosaicPop ? pop.muted : colors.muted,
          tabBarIndicatorStyle: isMosaicPop
            ? { backgroundColor: pop.orange, height: 4 }
            : { backgroundColor: colors.accent },
          tabBarLabelStyle: isMosaicPop
            ? { fontFamily: FontFamily.uiBold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' }
            : { fontFamily: FontFamily.uiMedium, fontSize: 13, textTransform: 'none' },
          tabBarStyle: isMosaicPop
            ? { backgroundColor: pop.paper, borderBottomWidth: 2.5, borderBottomColor: pop.ink }
            : { backgroundColor: colors.background },
        }}
      >
        <MaterialTopTabs.Screen name="forum" options={{ title: 'Forum' }} />
        <MaterialTopTabs.Screen name="friends" options={{ title: 'Amis' }} />
        <MaterialTopTabs.Screen name="messages" options={{ title: 'Messages' }} />
        <MaterialTopTabs.Screen name="groups" options={{ title: 'Groupes' }} />
      </MaterialTopTabs>
      </SafeAreaView>
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
  laterBtn: { paddingVertical: 12, alignItems: 'center' },
  laterText: { fontSize: 14 },
});
