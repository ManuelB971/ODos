import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Settings, Heart, LogOut, Edit, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
          style={styles.avatar}
        />
        <Text style={styles.email}>{user?.email || 'Email non disponible'}</Text>
      </View>

      <View style={styles.menuSection}>
        <Pressable style={styles.menuItem} onPress={() => router.push('/settings')}>
          <Settings color={Colors.light.primary} size={24} />
          <Text style={styles.menuText}>Paramètres</Text>
          <ChevronRight color={Colors.light.muted} size={20} style={styles.chevron} />
        </Pressable>

        <Pressable style={styles.menuItem} onPress={() => router.push('/(tabs)/favorites')}>
          <Heart color={Colors.light.primary} size={24} />
          <Text style={styles.menuText}>Mes favoris</Text>
          <ChevronRight color={Colors.light.muted} size={20} style={styles.chevron} />
        </Pressable>

        <Pressable style={styles.menuItem} onPress={() => router.push('/interests')}>
          <Edit color={Colors.light.primary} size={24} />
          <Text style={styles.menuText}>Changer mes intérêts</Text>
          <ChevronRight color={Colors.light.muted} size={20} style={styles.chevron} />
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color={Colors.light.danger} size={24} />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: Spacing.lg,
    paddingTop: 25,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  email: {
    fontSize: 16,
    color: Colors.light.muted,
  },
  menuSection: {
    marginTop: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuText: {
    marginLeft: 16,
    fontSize: 18,
    color: Colors.light.text,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.danger,
  },
});
