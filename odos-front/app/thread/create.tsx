import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { fetchCategories } from '@/scripts/api';
import { useForumMutations } from '@/hooks/useForumMutations';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';
import { odosAlert } from '@/context/OdosModalContext';
import { useIsMosaicPop, usePopTokens } from '@/components/pop/usePop';
import { FontFamily, Spacing } from '@/constants/theme';
import { CTAButton } from '@/components/ui/CTAButton';
import { InputField } from '@/components/ui/InputField';
import { logError, toAppError } from '@/utils/errorHandling';

const TITLE_MAX = 200;
const CONTENT_MAX = 4000;

/** Nettoyage rudimentaire (miroir du sanitizer backend). */
function clean(value: string): string {
  return value.replace(/[<>]/g, '').trim();
}

export default function CreateThreadScreen() {
  const colors = useOdosColors();
  const isMosaicPop = useIsMosaicPop();
  const pop = usePopTokens();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { createThread } = useForumMutations();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const canSubmit = clean(title).length >= 2 && clean(content).length >= 2 && categoryId !== null;

  const onSubmit = async () => {
    if (!canSubmit || createThread.isPending) return;
    try {
      const { thread } = await createThread.mutateAsync({
        title: clean(title),
        content: clean(content),
        categoryId: categoryId ?? undefined,
      });
      router.replace(`/thread/${thread.id}`);
    } catch (err) {
      logError('CreateThread.submit', err);
      odosAlert('Nouveau sujet', toAppError(err, 'Impossible de publier le sujet.').userMessage);
    }
  };

  const ink = isMosaicPop ? pop.ink : colors.text;

  return (
    <>
      <Stack.Screen options={{ title: 'Nouveau sujet', headerShown: true, presentation: 'modal' }} />
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: isMosaicPop ? pop.paper : colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <InputField
            label="Titre"
            placeholder="De quoi voulez-vous parler ?"
            value={title}
            onChangeText={setTitle}
            maxLength={TITLE_MAX}
          />

          <Text style={[styles.label, { color: ink }]}>Catégorie</Text>
          <View style={styles.chips}>
            {(categories ?? []).map((c) => {
              const active = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    active && { backgroundColor: isMosaicPop ? pop.orange : colors.accent, borderColor: isMosaicPop ? pop.ink : colors.accent },
                    isMosaicPop && { borderWidth: 2, borderColor: pop.ink },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? (isMosaicPop ? pop.ink : colors.onAccent) : ink,
                      fontFamily: FontFamily.uiMedium,
                      fontSize: 13,
                    }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: ink }]}>Message</Text>
          <TextInput
            value={content}
            onChangeText={(v) => v.length <= CONTENT_MAX && setContent(v)}
            multiline
            placeholder="Partagez votre question, votre bon plan, votre avis…"
            placeholderTextColor={colors.muted}
            style={[
              styles.textarea,
              { color: ink, backgroundColor: colors.surface, borderColor: colors.border },
              isMosaicPop && { borderWidth: 2, borderColor: pop.ink, backgroundColor: pop.background },
            ]}
            textAlignVertical="top"
          />

          <View style={{ height: 16 }} />
          <CTAButton
            label="Publier le sujet"
            onPress={onSubmit}
            loading={createThread.isPending}
            disabled={!canSubmit}
            size="md"
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: 40 },
    label: {
      fontSize: 13,
      fontFamily: FontFamily.uiBold,
      marginTop: 18,
      marginBottom: 8,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
    textarea: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: FontFamily.ui,
      minHeight: 140,
    },
  });
}
