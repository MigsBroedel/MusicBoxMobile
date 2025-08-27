import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
  id: string;
  name: string;
  pfp: string;
  bio?: string;
};

export default function FollowersPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const type = Array.isArray(params.type) ? params.type[0] : params.type; // "followers" ou "following"
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const storedId = await AsyncStorage.getItem("userid");
      setCurrentUserId(storedId);

      const endpoint = type === "followers" 
        ? `https://212.85.23.87/followers/${userId}`
        : `https://212.85.23.87/following/${userId}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar ${type}: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error("Resposta inesperada do servidor");
      }

      setUsers(data);
    } catch (err) {
      console.error(`Erro ao buscar ${type}:`, err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && type) {
      fetchUsers();
    }
  }, [userId, type]);

  const handleUserPress = (user: User) => {
    if (currentUserId === user.id) {
      // Se for o próprio usuário, vai para o perfil próprio
      router.push("userPageSelf");
    } else {
      // Se for outro usuário, vai para o perfil compartilhado
      router.push({
        pathname: "userPageShare",
        params: { id: user.id }
      });
    }
  };

  if (!userId || !type) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Parâmetros inválidos</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const title = type === "followers" ? "Seguidores" : "Seguindo";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>Carregando {title.toLowerCase()}...</Text>
        </View>
      ) : error ? (
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>Erro: {error}</Text>
          <TouchableOpacity onPress={fetchUsers} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : users.length === 0 ? (
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.emptyText}>
            {type === "followers" ? "Ainda não há seguidores" : "Ainda não está seguindo ninguém"}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userItem}
              onPress={() => handleUserPress(user)}
            >
              <Image source={{ uri: user.pfp }} style={styles.userImage} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                {user.bio && <Text style={styles.userBio} numberOfLines={1}>{user.bio}</Text>}
              </View>
              <Ionicons name="chevron-forward" color="#666" size={20} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40, // Para balancear o layout
  },
  scrollContainer: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userBio: {
    color: '#999',
    fontSize: 14,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#1DB954',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});