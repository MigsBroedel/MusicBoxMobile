import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlbumCard from '../components/albumCard';
import UserService from '../services/userService';
import { router, useFocusEffect } from 'expo-router';

// Definindo os tipos para a navegação
type RootStackParamList = {
  Home: undefined;
  Library: undefined;
  AlbumDetail: { albumId: string };
  ArtistDetail: { artistId: string };
};

type LibraryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Library'>;

// Interface para os dados do álbum do Spotify
interface SpotifyAlbum {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  release_date: string;
  total_tracks: number;
  album_type: string;
  external_urls: {
    spotify: string;
  };
}

// Tipos de ordenação
type SortType = 'recent' | 'alphabetical' | 'artist' | 'release_date';

// Função para buscar dados do álbum no Spotify
const fetchAlbumData = async (albumId: string, token: string): Promise<SpotifyAlbum> => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar álbum ${albumId}: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar álbum ${albumId}:`, error);
    throw error;
  }
};

// Função para buscar múltiplos álbuns
const fetchMultipleAlbums = async (albumIds: string[], token: string): Promise<SpotifyAlbum[]> => {
  try {
    // Dividir em grupos de 20 (limite da API)
    const chunks = [];
    for (let i = 0; i < albumIds.length; i += 20) {
      chunks.push(albumIds.slice(i, i + 20));
    }

    const allAlbums: SpotifyAlbum[] = [];

    for (const chunk of chunks) {
      const idsString = chunk.join(',');
      const response = await fetch(`https://api.spotify.com/v1/albums?ids=${idsString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        allAlbums.push(...data.albums.filter((album: SpotifyAlbum) => album !== null));
      }
    }

    return allAlbums;
  } catch (error) {
    console.error('Erro ao buscar múltiplos álbuns:', error);
    throw error;
  }
};

// Componente do header da biblioteca
const LibraryHeader: React.FC<{
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
  albumCount: number;
  onSearch: () => void;
}> = ({ sortType, onSortChange, albumCount, onSearch }) => {
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions: Array<{ key: SortType; label: string; icon: string }> = [
    { key: 'recent', label: 'Adicionados recentemente', icon: 'time-outline' },
    { key: 'alphabetical', label: 'Ordem alfabética', icon: 'text-outline' },
    { key: 'artist', label: 'Por artista', icon: 'person-outline' },
    { key: 'release_date', label: 'Data de lançamento', icon: 'calendar-outline' },
  ];

  return (
    <View style={styles.libraryHeader}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.libraryTitle}>Sua Biblioteca</Text>
          <Text style={styles.albumCount}>{albumCount} álbuns salvos</Text>
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={onSearch}>
          <Ionicons name="search-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.headerControls}>
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Ionicons name="swap-vertical-outline" size={18} color="white" />
          <Text style={styles.sortButtonText}>
            {sortOptions.find(option => option.key === sortType)?.label}
          </Text>
          <Ionicons 
            name={showSortMenu ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={16} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      {showSortMenu && (
        <View style={styles.sortMenu}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortMenuItem,
                sortType === option.key && styles.sortMenuItemActive
              ]}
              onPress={() => {
                onSortChange(option.key);
                setShowSortMenu(false);
              }}
            >
              <Ionicons 
                name={option.icon as any} 
                size={20} 
                color={sortType === option.key ? '#1DB954' : 'white'} 
              />
              <Text style={[
                styles.sortMenuItemText,
                sortType === option.key && styles.sortMenuItemTextActive
              ]}>
                {option.label}
              </Text>
              {sortType === option.key && (
                <Ionicons name="checkmark" size={20} color="#1DB954" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// Componente principal da biblioteca
export default function LibraryPage() {
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('recent');
  const [savedAlbumIds, setSavedAlbumIds] = useState<string[]>([]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LibraryScreenNavigationProp>();

  // Função para carregar IDs dos álbuns salvos do UserService
  const loadSavedAlbumIds = async (): Promise<string[]> => {
    try {
      // Assumindo que seu UserService tem um método para buscar álbuns salvos
      const albumIds = await UserService.getLocalListenList();
      return albumIds;
    } catch (error) {
      console.error('Erro ao carregar IDs dos álbuns salvos:', error);
      throw error;
    }
  };

  // Função para carregar dados completos dos álbuns
  const loadAlbumsData = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Verificar token
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Token de acesso não encontrado. Faça login novamente.');
      }

      // Carregar IDs dos álbuns salvos
      const albumIds = await loadSavedAlbumIds();
      setSavedAlbumIds(albumIds);

      if (albumIds.length === 0) {
        setAlbums([]);
        return;
      }

      // Buscar dados completos dos álbuns no Spotify
      const albumsData = await fetchMultipleAlbums(albumIds, token);
      setAlbums(albumsData);

    } catch (err: any) {
      console.error('Erro ao carregar biblioteca:', err);
      setError(err.message || 'Erro ao carregar biblioteca');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadAlbumsData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Re-carrega os dados sempre que a tela ganha foco
      loadAlbumsData();
    }, [])
  );

  // Função para ordenar álbuns
  const getSortedAlbums = useCallback((): SpotifyAlbum[] => {
    const sortedAlbums = [...albums];

    switch (sortType) {
      case 'alphabetical':
        return sortedAlbums.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'artist':
        return sortedAlbums.sort((a, b) => 
          a.artists[0]?.name.localeCompare(b.artists[0]?.name || '') || 0
        );
      
      case 'release_date':
        return sortedAlbums.sort((a, b) => 
          new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
        );
      
      case 'recent':
      default:
        // Ordenar pela ordem dos IDs salvos (mais recente primeiro)
        return sortedAlbums.sort((a, b) => {
          const indexA = savedAlbumIds.indexOf(a.id);
          const indexB = savedAlbumIds.indexOf(b.id);
          return indexA - indexB;
        });
    }
  }, [albums, sortType, savedAlbumIds]);

  // Função para lidar com o pull-to-refresh
  const onRefresh = useCallback(() => {
    loadAlbumsData(true);
  }, []);

  // Função para navegar para detalhes do álbum
  const handleAlbumPress = (albumId: string) => {
    router.push({
        pathname: 'albumPage',
        params: {
            id: albumId
        }
    })
  };

  // Função para busca (placeholder)
  const handleSearch = () => {
    // Implementar navegação para tela de busca ou modal
    console.log('Abrir busca na biblioteca');
  };

  // Renderizar item da lista
  const renderAlbumItem = ({ item }: { item: SpotifyAlbum }) => (
    <AlbumCard
      album={item}
      onPress={() => handleAlbumPress(item.id)}
    />
  );

  // Estados de loading e erro
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1a1a1a', '#000000']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Carregando sua biblioteca...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1a1a1a', '#000000']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="library-outline" size={64} color="#666" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => loadAlbumsData()}
            >
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const sortedAlbums = getSortedAlbums();

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={['#1a1a1a', '#000000']} style={styles.gradient}>
        {/* Header da Biblioteca */}
        <LibraryHeader
          sortType={sortType}
          onSortChange={setSortType}
          albumCount={albums.length}
          onSearch={handleSearch}
        />

        {/* Lista de Álbuns */}
        {sortedAlbums.length > 0 ? (
          <FlatList
            data={sortedAlbums}
            renderItem={renderAlbumItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.albumsList}
            columnWrapperStyle={styles.albumsRow}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#1DB954']}
                tintColor="#1DB954"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#1DB954']}
                tintColor="#1DB954"
              />
            }
          >
            <Ionicons name="library-outline" size={80} color="#666" />
            <Text style={styles.emptyTitle}>Sua biblioteca está vazia</Text>
            <Text style={styles.emptySubtitle}>
              Adicione álbuns aos seus favoritos para vê-los aqui
            </Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => {router.push('searchPage')}}>
              <Text style={styles.exploreButtonText}>Explorar Música</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  libraryHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    margin: 10
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  libraryTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  albumCount: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  searchButton: {
    padding: 8,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sortButtonText: {
    color: 'white',
    fontSize: 12,
    marginHorizontal: 8,
  },
  sortMenu: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortMenuItemActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  sortMenuItemText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  sortMenuItemTextActive: {
    color: '#1DB954',
  },
  albumsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  albumsRow: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: '#007196',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});