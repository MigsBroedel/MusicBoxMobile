import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { router } from 'expo-router';

type RootStackParamList = {
  Profile: { userId: string };
  Home: undefined;
};

type SearchUsersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface User {
  id: string;
  name: string;
  pfp: string;
  spotifyID: string;
  bio?: string;
}

const API_BASE_URL = 'https://212.85.23.87'; // Substitua pelo seu host real

const UserCard: React.FC<{ user: User; onPress: (userId: string) => void }> = ({ user, onPress }) => (
  <TouchableOpacity
    style={styles.userCard}
    onPress={() => onPress(user.id)}
    activeOpacity={0.7}
  >
    <Image
      source={{ uri: user.pfp || 'https://via.placeholder.com/60x60?text=User' }}
      style={styles.userImage}
    />
    <View style={styles.userInfo}>
      <Text style={styles.username}>{user.name || `@${user.spotifyID?.slice(0, 10)}...`}</Text>
      {user.bio ? (
        <Text style={styles.bio}>{user.bio}</Text>
      ) : (
        <Text style={styles.bio}>Sem bio</Text>
      )}
    </View>
    <Ionicons name="chevron-forward" size={24} color="#666" style={styles.chevron} />
  </TouchableOpacity>
);

const SearchUsersScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SearchUsersScreenNavigationProp>();

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://212.85.23.87/users?name=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setFilteredUsers(data);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setFilteredUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserPress = (userId: string) => {
    router.push({
        pathname: `userPageShare`,
        params: {
            id: userId
        }
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#121212', '#1E1E1E']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('home')}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buscar Usuários</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome de usuário"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
          </View>
        ) : searchQuery.trim() === '' ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="people" size={64} color="#555" />
            <Text style={styles.emptyStateText}>Digite algo para buscar usuários</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="search" size={64} color="#555" />
            <Text style={styles.emptyStateText}>Nenhum usuário encontrado</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <UserCard user={item} onPress={handleUserPress} />}
            contentContainerStyle={styles.usersList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  usersList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bio: {
    color: '#ccc',
    fontSize: 13,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default SearchUsersScreen;
