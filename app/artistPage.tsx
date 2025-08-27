import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';

// Definindo os tipos para a navegação
type RootStackParamList = {
  Home: undefined;
  ArtistDetail: { artistId: string };
  AlbumDetail: { albumId: string };
};

type ArtistDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>;
type ArtistDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArtistDetail'>;

// Interfaces para tipagem
interface Album {
  id: string;
  name: string;
  release_date: string;
  images: Array<{ url: string; height: number; width: number }>;
  album_type: string;
  total_tracks: number;
}

interface Artist {
  id: string;
  name: string;
  images: Array<{ url: string; height: number; width: number }>;
  followers: { total: number };
  genres: string[];
  popularity: number;
  external_urls: { spotify: string };
}

interface SpotifyArtistData {
  artist: Artist;
  albums: Album[];
  isFavorite: boolean;
}

interface UserData {
  id: string;
  favoriteArtists?: string[];
  // outros campos do usuário
}

// Tipos de filtro
type FilterType = 'all' | 'album' | 'single';

// Função para buscar dados do usuário
const fetchUserData = async (userId: string): Promise<UserData> => {
  try {
    const response = await axios.get(`https://212.85.23.87/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    throw error;
  }
};

// Função para verificar se o artista está nos favoritos
const checkIfArtistIsFavorite = async (artistId: string): Promise<boolean> => {
  try {
    const userId = await AsyncStorage.getItem('userid');
    if (!userId) return false;

    const userData = await fetchUserData(userId);
    const favoriteArtists = userData.favoriteArtists || [];
    
    return favoriteArtists.includes(artistId);
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    return false;
  }
};

const fetchArtistData = async (artistId: string): Promise<SpotifyArtistData> => {
  try {
    // Await para pegar o token corretamente do AsyncStorage
    const token = await AsyncStorage.getItem('accessToken');
    
    console.log('Token recuperado:', token ? 'Token exists' : 'Token is null');
    console.log('Artist ID:', artistId);
    
    if (!token) {
      throw new Error('Token de acesso não encontrado. Faça login novamente.');
    }
    
    // Buscar informações do artista (usando o artistId passado como parâmetro)
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Artist Response Status:', artistResponse.status);
    
    if (!artistResponse.ok) {
      const errorData = await artistResponse.text();
      console.log('Error Response:', errorData);
      
      if (artistResponse.status === 401) {
        throw new Error('Token de acesso expirado. Faça login novamente.');
      } else if (artistResponse.status === 400) {
        throw new Error('Solicitação inválida. Verifique o ID do artista.');
      } else if (artistResponse.status === 404) {
        throw new Error('Artista não encontrado.');
      } else {
        throw new Error(`Erro na API: ${artistResponse.status}`);
      }
    }
    
    const artist = await artistResponse.json();
    console.log('Artist data loaded:', artist.name);
    
    // Buscar álbuns do artista
    const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?market=BR&limit=50&include_groups=album,single`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!albumsResponse.ok) {
      console.log('Albums Response Status:', albumsResponse.status);
      // Se falhar ao buscar álbuns, ainda retorna o artista sem álbuns
      return {
        artist,
        albums: [],
        isFavorite: await checkIfArtistIsFavorite(artistId),
      };
    }
    
    const albumsData = await albumsResponse.json();
    console.log('Albums loaded:', albumsData.items?.length || 0);
    
    // Verificar se o artista está nos favoritos
    const isFavorite = await checkIfArtistIsFavorite(artistId);
    
    return {
      artist,
      albums: albumsData.items || [],
      isFavorite,
    };
  } catch (error) {
    console.error('Erro ao buscar dados do Spotify:', error);
    throw error;
  }
};

// Função de toast simples usando Alert
const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
  Alert.alert(
    type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Informação',
    message,
    [{ text: 'OK' }]
  );
};

// Componente para as tabs de filtro
const FilterTabs: React.FC<{ 
  activeFilter: FilterType; 
  onFilterChange: (filter: FilterType) => void;
  albumCount: number;
  singleCount: number;
  totalCount: number;
}> = ({ activeFilter, onFilterChange, albumCount, singleCount, totalCount }) => {
  const tabs: Array<{ key: FilterType; label: string; count: number }> = [
    { key: 'all', label: 'Todos', count: totalCount },
    { key: 'album', label: 'Álbuns', count: albumCount },
    { key: 'single', label: 'Singles', count: singleCount },
  ];

  return (
    <View style={styles.filterTabs}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.filterTab,
            activeFilter === tab.key && styles.filterTabActive
          ]}
          onPress={() => onFilterChange(tab.key)}
        >
          <Text style={[
            styles.filterTabText,
            activeFilter === tab.key && styles.filterTabTextActive
          ]}>
            {tab.label} ({tab.count})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Componente para exibir um álbum (agora maior - 2 por linha)
const AlbumCard: React.FC<{ album: Album; onPress: (album: Album) => void }> = ({ album, onPress }) => {
  const coverImage = album.images && album.images.length > 0 ? album.images[0].url : null;
  const releaseYear = album.release_date ? new Date(album.release_date).getFullYear().toString() : '';
  
  return (
    <TouchableOpacity style={styles.albumCard} onPress={() => onPress(album)}>
      <Image 
        source={{ uri: coverImage || 'https://via.placeholder.com/400x400/333/fff?text=No+Image' }} 
        style={styles.albumCover} 
      />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={2}>{album.name}</Text>
        <Text style={styles.albumYear}>{releaseYear}</Text>
        <View style={styles.albumMeta}>
          <Text style={styles.albumType}>{album.album_type.toUpperCase()}</Text>
          {album.total_tracks && (
            <Text style={styles.albumTracks}>• {album.total_tracks} faixas</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Componente para o botão de ordenação por ano
const YearSortButton: React.FC<{ onPress: () => void; isSorted: boolean }> = ({ onPress, isSorted }) => {
  return (
    <TouchableOpacity style={[styles.yearSortButton, isSorted && styles.yearSortButtonActive]} onPress={onPress}>
      <Ionicons 
        name={isSorted ? "calendar" : "calendar-outline"} 
        size={16} 
        color={isSorted ? "#1DB954" : "white"} 
      />
      <Text style={[styles.yearSortText, isSorted && styles.yearSortTextActive]}>
        Por ano
      </Text>
    </TouchableOpacity>
  );
};

export default function ArtistPage() {
  const [artistData, setArtistData] = useState<SpotifyArtistData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortedByYear, setSortedByYear] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ArtistDetailScreenNavigationProp>();
  const route = useRoute<ArtistDetailScreenRouteProp>();
  
  const { artistId } = route.params;

  // Carregar dados do artista ao montar o componente
  useEffect(() => {
    const loadArtistData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verificar se o token existe antes de fazer a requisição
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          setError('Token de acesso não encontrado. Faça login novamente.');
          return;
        }
        
        const data = await fetchArtistData(artistId);
        setArtistData(data);
      } catch (err: any) {
        console.error('Erro no useEffect:', err);
        setError(err.message || 'Erro ao carregar dados do artista');
      } finally {
        setLoading(false);
      }
    };

    loadArtistData();
  }, [artistId]);

  // Função para alternar o status de favorito
  const toggleFavorite = async () => {
    if (!artistData || favoriteLoading) return;
    
    try {
      setFavoriteLoading(true);
      
      const userId = await AsyncStorage.getItem('userid');
      if (!userId) {
        Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
        return;
      }

      console.log("User ID:", userId);
      console.log("Artist ID:", artistId);
      console.log("Current favorite status:", artistData.isFavorite);

      // Buscar dados atuais do usuário
      const userData = await fetchUserData(userId);
      const currentFavorites = userData.favoriteArtists || [];
      
      let updatedFavorites: string[];
      let isNowFavorite: boolean;

      if (artistData.isFavorite) {
        // Remover dos favoritos
        updatedFavorites = currentFavorites.filter(id => id !== artistId);
        isNowFavorite = false;
      } else {
        // Adicionar aos favoritos
        updatedFavorites = [...currentFavorites, artistId];
        isNowFavorite = true;
      }

      const updatedUser = {
        favoriteArtists: updatedFavorites,
      };
      console.log(userId, updatedUser)

      const response = await axios.patch(`https://212.85.23.87/users/${userId}`, updatedUser);
      console.log("Usuário atualizado:", response.data);

      // Atualizar o estado local
      setArtistData(prev => prev ? { ...prev, isFavorite: isNowFavorite } : null);

      // Mostrar feedback
      showToast(
        isNowFavorite 
          ? `${artistData.artist.name} adicionado aos favoritos` 
          : `${artistData.artist.name} removido dos favoritos`,
        isNowFavorite ? 'success' : 'info'
      );

    } catch (error: any) {
      console.error("Erro ao salvar favorito:", error);
      Alert.alert(
        "Erro", 
        `Erro ao ${artistData.isFavorite ? 'remover' : 'adicionar'} favorito: ${error.message || 'Erro desconhecido'}`
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Função para navegar para a tela de detalhes do álbum
  const handleAlbumPress = (album: Album) => {
    router.push({ pathname: 'albumPage', params: { id: album.id } });
  };

  // Função para filtrar álbuns por tipo
  const getFilteredAlbums = (): Album[] => {
    if (!artistData) return [];
    
    let filtered = artistData.albums;
    
    // Aplicar filtro por tipo
    if (activeFilter !== 'all') {
      filtered = filtered.filter(album => album.album_type === activeFilter);
    }
    
    // Aplicar ordenação por ano se ativa
    if (sortedByYear) {
      filtered = [...filtered].sort((a, b) => 
        new Date(b.release_date).getFullYear() - new Date(a.release_date).getFullYear()
      );
    }
    
    return filtered;
  };

  // Função para alternar ordenação por ano
  const handleYearSort = () => {
    setSortedByYear(!sortedByYear);
    showToast(
      sortedByYear ? 'Ordenação por ano removida' : 'Álbuns ordenados por ano', 
      'info'
    );
  };

  // Calcular contadores para as tabs
  const albumCount = artistData?.albums.filter(album => album.album_type === 'album').length || 0;
  const singleCount = artistData?.albums.filter(album => album.album_type === 'single').length || 0;
  const totalCount = artistData?.albums.length || 0;

  // Estados de loading e erro
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#000000', '#111111']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Carregando artista...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error || !artistData) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#000000', '#111111']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
            <Text style={styles.errorText}>{error || 'Artista não encontrado'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => {
              // Retry function
              const retryLoad = async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const data = await fetchArtistData(artistId);
                  setArtistData(data);
                } catch (err: any) {
                  setError(err.message || 'Erro ao carregar dados do artista');
                } finally {
                  setLoading(false);
                }
              };
              retryLoad();
            }}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: '#333', marginTop: 12 }]} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const { artist, albums, isFavorite } = artistData;
  const artistImage = artist.images && artist.images.length > 0 ? artist.images[0].url : null;
  const followerCount = artist.followers.total.toLocaleString('pt-BR');
  const bio = `${artist.name} possui ${followerCount} seguidores no Spotify. Gêneros: ${artist.genres.join(', ') || 'Não especificado'}. Popularidade: ${artist.popularity}/100.`;
  
  const filteredAlbums = getFilteredAlbums();

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#000000', '#111111']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="person-circle-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.content}>
          {/* Artist Info */}
          <View style={styles.artistInfo}>
            <Image 
              source={{ uri: artistImage || 'https://via.placeholder.com/300x300/333/fff?text=No+Image' }} 
              style={styles.artistImage} 
            />
            <View style={styles.artistNameContainer}>
              <Text style={styles.artistName}>{artist.name}</Text>
              <Text style={styles.followerCount}>{followerCount} seguidores</Text>
              
              <TouchableOpacity 
                style={[styles.favoriteButton, favoriteLoading && styles.favoriteButtonDisabled]}
                onPress={toggleFavorite}
                disabled={favoriteLoading}
              >
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons 
                    name={isFavorite ? "heart" : "heart-outline"} 
                    size={28} 
                    color={isFavorite ? "#ff3b30" : "white"} 
                  />
                )}
              </TouchableOpacity>
              
              <View style={styles.genresContainer}>
                {artist.genres.slice(0, 3).map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          {/* Bio Section */}
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>Informações</Text>
            <View style={styles.bioContainer}>
              <Text style={styles.bioText} numberOfLines={bioExpanded ? undefined : 3}>
                {bio}
              </Text>
              <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                <Text style={styles.readMoreText}>
                  {bioExpanded ? 'Ver menos' : 'Ver mais...'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Albums Section */}
          <View style={styles.albumsSection}>
            <View style={styles.albumsHeader}>
              <Text style={styles.sectionTitle}>Discografia</Text>
              <YearSortButton onPress={handleYearSort} isSorted={sortedByYear} />
            </View>
            
            {/* Filter Tabs */}
            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              albumCount={albumCount}
              singleCount={singleCount}
              totalCount={totalCount}
            />
            
            {/* Albums Grid */}
            <View style={styles.albumsGrid}>
              {filteredAlbums.map(album => (
                <AlbumCard 
                  key={album.id} 
                  album={album} 
                  onPress={handleAlbumPress} 
                />
              ))}
            </View>
            
            {filteredAlbums.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>
                  Nenhum {activeFilter === 'album' ? 'álbum' : activeFilter === 'single' ? 'single' : 'item'} encontrado
                </Text>
              </View>
            )}
          </View>
          
          {/* Spacer for bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const albumWidth = (width - 48) / 2; // 2 albums per row with padding

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 16,
  },
  content: {
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
  artistInfo: {
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  artistImage: {
    width: 140,
    height: 140,
    borderRadius: 25,
    marginBottom: 16,
  },
  artistNameContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  artistName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  favoriteButton: {
    padding: 12,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  favoriteButtonDisabled: {
    opacity: 0.6,
  },
  followerCount: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    justifyContent: 'center',
  },
  genreTag: {
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  genreText: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: '500',
  },
  bioSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bioContainer: {
    backgroundColor: 'rgba(77, 77, 77, 0.3)',
    borderRadius: 8,
    padding: 16,
  },
  bioText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  readMoreText: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  albumsSection: {
    paddingHorizontal: 16,
  },
  albumsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  yearSortButtonActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
  },
  yearSortText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
  },
  yearSortTextActive: {
    color: '#1DB954',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1DB954',
  },
  filterTabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  albumCard: {
    width: albumWidth,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  albumCover: {
    width: albumWidth,
    height: albumWidth,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  albumInfo: {
    padding: 12,
  },
  albumTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  albumYear: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  albumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumType: {
    color: '#1DB954',
    fontSize: 10,
    fontWeight: '500',
  },
  albumTracks: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});