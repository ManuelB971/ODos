import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Settings, Heart, Clock, LogOut, Edit } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signOut } from './database/auth';
import { useAuth } from '@/context/AuthContext';

export default function AccountScreen() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    const { success } = await signOut();
    if (success) {
      setUser(null);
      router.replace('/login');
    }
  };

  const handleChangeInterests = () => {
    router.push('/interests');
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
        <Pressable style={styles.menuItem}>
          <Settings color="#3b82f6" size={24} />
          <Text style={styles.menuText}>Parametres</Text>
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Heart color="#3b82f6" size={24} />
          <Text style={styles.menuText}>Favorites</Text>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={handleChangeInterests}>
          <Edit color="#3b82f6" size={24} />
          <Text style={styles.menuText}>Changer mes intérêts</Text>
        </Pressable>

      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color="#ef4444" size={24} />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
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
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#64748b',
  },
  menuSection: {
    marginTop: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 18,
    color: '#1e293b',
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
    color: '#ef4444',
  },
});
