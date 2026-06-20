import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useOdosColors } from '@/context/ThemeContext';
import { FontFamily } from '@/constants/theme';
import { CTAButton } from '@/components/ui/CTAButton';
import { useGroupMutations } from '@/hooks/useGroups';

const NAME_MAX = 100;
const DESC_MAX = 500;

export default function CreateGroupScreen() {
  const colors = useOdosColors();
  const router = useRouter();
  const { create } = useGroupMutations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !create.isPending;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      const result = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
      });
      const id = result.group?.id;
      if (id) {
        router.replace(`/group/${id}`);
      } else {
        router.back();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Impossible de créer le groupe.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Nouveau groupe', headerShown: true, presentation: 'modal' }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>Nom du groupe</Text>
        <TextInput
          value={name}
          onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
          placeholder="Ex : Randonneurs de Guadeloupe"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, fontFamily: FontFamily.ui }]}
        />

        <Text style={[styles.label, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>Description (optionnel)</Text>
        <TextInput
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
          placeholder="De quoi parle ce groupe ?"
          placeholderTextColor={colors.muted}
          multiline
          style={[
            styles.input,
            styles.textarea,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, fontFamily: FontFamily.ui },
          ]}
        />

        <View style={[styles.switchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchTitle, { color: colors.text, fontFamily: FontFamily.uiMedium }]}>Groupe privé</Text>
            <Text style={[styles.switchSub, { color: colors.muted, fontFamily: FontFamily.ui }]}>
              {isPrivate ? 'On ne peut rejoindre que sur invitation.' : 'Visible dans « Découvrir », tout le monde peut rejoindre.'}
            </Text>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} />
        </View>

        {error ? <Text style={[styles.error, { color: colors.danger, fontFamily: FontFamily.ui }]}>{error}</Text> : null}

        <CTAButton
          label="Créer le groupe"
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={create.isPending}
          fullWidth
          style={styles.cta}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  label: { fontSize: 14, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  switchTitle: { fontSize: 15 },
  switchSub: { fontSize: 12, marginTop: 2 },
  error: { fontSize: 13, marginTop: 12 },
  cta: { marginTop: 24 },
});
