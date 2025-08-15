import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, SafeAreaView, View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator, Image, Alert } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import tokenManagerInstance from "../services/tokenManager";

type TabBarProps = {
  activeTab: number;
  setActiveTab: (index: number) => void;
};

const TabBar = ({ activeTab, setActiveTab }: TabBarProps) => {
  const tabs = ['Álbums / Single', 'Artistas'];
  
  return (
    <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => { router.back()}} style={{marginTop: 5}}>
            <Ionicons name="chevron-back" size={24} color={"white"}/>
        </TouchableOpacity>
      {tabs.map((tab, index) => (
        <TouchableOpacity 
          key={index} 
          style={[styles.tab, activeTab === index && styles.activeTab]}
          onPress={() => setActiveTab(index)}
        >
          <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

type SpotifyResult = {
  id: string;
  name: string;
  image: string;
  type: "album" | "artist" | "single";
  artist?: string;
};

const spotifySearch = async (query: string, type: string): Promise<SpotifyResult[]> => {
  if (!query || query.length < 2) return [];

  try {
    console.log(`🔍 Buscando: "${query}" (tipo: ${type})`);
    
    // Verifica se os tokens existem antes de fazer a busca
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (!accessToken || !refreshToken) {
      throw new Error('Tokens não encontrados. Faça login novamente.');
    }

    const encodedQuery = encodeURIComponent(query.trim());
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=${type}&limit=20&market=BR`;
    
    console.log(`🌐 URL da busca: ${searchUrl}`);
    
    const response = await tokenManagerInstance.makeAuthenticatedRequest(searchUrl);

    if (!response.ok) {
      console.error(`❌ Erro na resposta: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        throw new Error('Sessão expirada. Redirecionando para login...');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Verifique as permissões do Spotify.');
      } else if (response.status >= 500) {
        throw new Error('Erro do servidor Spotify. Tente novamente.');
      } else {
        throw new Error(`Erro na busca: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('✅ Dados recebidos do Spotify:', { 
      albums: data.albums?.items?.length || 0,
      artists: data.artists?.items?.length || 0 
    });

    let results: SpotifyResult[] = [];

    // Se estamos buscando albums/singles
    if (type.includes('album') && data.albums?.items) {
      const albums = data.albums.items;
      results = [...results, ...albums.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: item.artists?.[0]?.name || 'Artista Desconhecido',
        image: item.images?.[0]?.url || '',
        type: item.album_type === 'single' ? 'single' : 'album' as const,
      }))];
    }

    // Se estamos buscando artistas
    if (type.includes('artist') && data.artists?.items) {
      const artists = data.artists.items;
      results = [...results, ...artists.map((item: any) => ({
        id: item.id,
        name: item.name,
        image: item.images?.[0]?.url || '',
        type: 'artist' as const,
      }))];
    }

    console.log(`✅ Busca concluída: ${results.length} resultados encontrados`);
    return results;
    
  } catch (error) {
    console.error('❌ Erro na busca do Spotify:', error);
    
    // Tratamento específico para erros de autenticação
    if (error instanceof Error) {
      if (error.message.includes('Tokens não encontrados') || 
          error.message.includes('Sessão expirada')) {
        // Limpa os dados e redireciona para login
        await tokenManagerInstance.clearTokens();
        
        Alert.alert(
          'Sessão Expirada',
          'Sua sessão expirou. Por favor, faça login novamente.',
          [{ 
            text: 'OK', 
            onPress: () => {
              router.replace('/login');
            }
          }]
        );
      }
      
      throw error;
    }
    
    throw new Error('Erro desconhecido na busca');
  }
};

function SearchBar({ activeTab }: { activeTab: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyResult[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verifica autenticação ao montar o componente
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await tokenManagerInstance.isAuthenticated();
      if (!isAuth) {
        Alert.alert(
          'Não Autenticado',
          'Você precisa fazer login para usar a busca.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length > 2) {
        setIsLoading(true);
        setError(null);
        
        try {
          const searchType = activeTab === 0 ? 'album' : 'artist';
          console.log(`🔍 Iniciando busca para: "${query}" (tab: ${activeTab})`);
          
          const searchResults = await spotifySearch(query, searchType);
          setResults(searchResults);
          setShowOverlay(true);
          
        } catch (err) {
          console.error('❌ Erro na busca:', err);
          const errorMessage = err instanceof Error ? err.message : 'Erro na busca';
          setError(errorMessage);
          setResults([]);
          setShowOverlay(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowOverlay(false);
        setResults([]);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [query, activeTab]);

  const handleItemPress = (item: SpotifyResult) => {
    try {
      console.log(`📱 Navegando para: ${item.type} - ${item.name}`);
      
      if (activeTab === 0) {
        router.push({
          pathname: "/albumPage" as any,
          params: { id: item.id }
        });
      } else {
        router.push({
          pathname: "/artistPage" as any,
          params: { artistId: item.id }
        });
      }
    } catch (err) {
      console.error('❌ Erro ao navegar:', err);
      Alert.alert('Erro', 'Não foi possível abrir esta página');
    }
  };

  const handleRetry = async () => {
    if (query.length > 2) {
      setError(null);
      setIsLoading(true);
      
      try {
        const searchType = activeTab === 0 ? 'album' : 'artist';
        const searchResults = await spotifySearch(query, searchType);
        setResults(searchResults);
      } catch (err) {
        console.error('❌ Erro no retry:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro na busca';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderEmptyState = () => {
    if (query.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons 
            name={activeTab === 0 ? "musical-notes" : "person"} 
            size={48} 
            color="#666" 
          />
          <Text style={styles.emptyStateText}>
            {activeTab === 0 ? "Digite para buscar álbuns e singles" : "Digite para buscar artistas"}
          </Text>
        </View>
      );
    }

    if (query.length > 0 && query.length <= 2) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            Digite pelo menos 3 caracteres para buscar
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>Erro na busca</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!isLoading && results.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="search" size={48} color="#666" />
          <Text style={styles.emptyStateText}>
            Nenhum resultado encontrado
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Tente usar outros termos de busca
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        placeholder={activeTab === 0 ? "Buscar álbuns e singles" : "Buscar artistas"}
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {showOverlay && (
        <View style={styles.overlay}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1db954" />
              <Text style={styles.loadingText}>Buscando...</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.item} 
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image }} 
                      style={styles.image}
                    />
                  ) : (
                    <View style={[styles.image, styles.placeholderImage]}>
                      <Ionicons 
                        name={item.type === 'artist' ? 'person' : 'musical-notes'} 
                        size={24} 
                        color="#666" 
                      />
                    </View>
                  )}
                  <View style={styles.textContainer}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {item.artist && (
                      <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
                    )}
                    <Text style={styles.type}>
                      {item.type === 'artist' ? 'Artista' : 
                       item.type === 'album' ? 'Álbum' : 'Single'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              )}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState()}
            />
          )}
        </View>
      )}

      {!showOverlay && renderEmptyState()}
    </View>
  );
}

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <SearchBar activeTab={activeTab} />
    </SafeAreaView>
  );
}

// Estilos permanecem os mesmos
const styles = StyleSheet.create({
  container: {
    padding: 30,
    paddingTop: 50,
    backgroundColor: "#0f0f0f",
    flex: 1,
  },
  input: {
    fontSize: 16,
    borderColor: '#333',
    backgroundColor: "#1a1a1a",
    color: "white",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
    borderWidth: 1,
  },
  overlay: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    height: 800,
    zIndex: 999,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  list: {
    paddingVertical: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 2,
    borderRadius: 5,
    backgroundColor: "#2a2a2a",
    marginHorizontal: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-around',
    paddingBottom: 10,
    zIndex: 0,
  },
  tab: {
    backgroundColor: "#222",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: "#1db954",
  },
  tabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  image: {
    width: 48,
    height: 48,
    marginRight: 15,
    borderRadius: 6,
  },
  placeholderImage: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    marginBottom: 2,
  },
  artist: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  type: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#999',
    marginTop: 10,
    fontSize: 14,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  errorSubtext: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: '#1db954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});