import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SpotifyAlbum } from '../types/spotifyAlbumType';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from '../services/userService';
import BottomSheet from '../components/reviewBottomTab';
import axios from 'axios';

const { width } = Dimensions.get('window');

interface Review {
  id: string;
  albumid: string;
  nota: number;
  likes: number;
  text: string;
}

interface UserData {
  id: string;
  favoriteAlbums?: string[];
  // outros campos do usuário
}

const FloatingActionButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress}>
      <Ionicons name="add" size={24} color="white" />
    </TouchableOpacity>
  );
};

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFD700" />);
    }

    const remainingStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />);
    }

    return stars;
  };

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewRating}>
            {renderStars(review.nota)}
            <Text style={styles.reviewRatingText}>({review.nota}/10)</Text>
          </View>
        </View>
        <Text style={styles.reviewComment}>{review.text}</Text>
        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.reviewAction}>
            <Ionicons name="heart-outline" size={16} color="white" />
            <Text style={styles.reviewActionText}>{review.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const RatingDisplay: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.nota, 0) / reviews.length
      : 0;

  const renderStars = (rating: number) => {
    const stars = [];
    const adjustedRating = rating / 2;
    const fullStars = Math.floor(adjustedRating);
    const hasHalfStar = adjustedRating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={24} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={24} color="#FFD700" />);
    }

    const remainingStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={24} color="#FFD700" />);
    }

    return stars;
  };

  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingTitle}>Avaliação</Text>
      <View style={styles.ratingContent}>
        <View style={styles.starsContainer}>{renderStars(averageRating)}</View>
        <Text style={styles.ratingValue}>{averageRating.toFixed(1)}/10</Text>
        <Text style={styles.reviewCount}>
          {reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}
        </Text>
      </View>
    </View>
  );
};

const AlbumDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const [album, setAlbum] = useState<SpotifyAlbum>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false); // Novo estado para favoritos

  // Novos estados para BottomSheet
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewNota, setReviewNota] = useState(0);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          console.error('Token de acesso não encontrado');
          return;
        }

        const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAlbum(data);
        } else {
          console.error('Erro ao buscar álbum:', response.status);
        }
      } catch (error) {
        console.error('Erro na busca do álbum:', error);
      }
    };

    fetchAlbum();
  }, [id]);

  const fetchReviews = async () => {
      try {
        const response = await fetch(`https://212.85.23.87/review/album/${id}`);

        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        } else {
          console.error('Erro ao buscar reviews:', response.status);
          setReviews([]);
        }
      } catch (error) {
        console.error('Erro na busca dos reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReviews();
    }

  useEffect(() => {
    if (id) {
      fetchReviews()
    }
  }, [id]);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (id) {
        const saved = await UserService.isAlbumInListenList(id as string);
        setIsSaved(saved);
      }
    };

    checkSavedStatus();
  }, [id]);

  // Novo useEffect para verificar se o álbum é favorito
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (id) {
        const favorite = await checkIfAlbumIsFavorite(id as string);
        setIsFavorite(favorite);
      }
    };

    checkFavoriteStatus();
  }, [id]);

  const fetchUserData = async (userId: string): Promise<UserData> => {
  try {
    const response = await axios.get(`https://212.85.23.87/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    throw error;
  }
};


  const checkIfAlbumIsFavorite = async (albumId: string): Promise<boolean> => {
  try {
    const userId = await AsyncStorage.getItem('userid');
    if (!userId) return false;

    const userData = await fetchUserData(userId);
    const favoriteAlbums = userData.favoriteAlbums || [];
    
    return favoriteAlbums.includes(albumId);
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    return false;
  }
};

  // Nova função para adicionar/remover dos favoritos
  const handleFavoritePress = async () => {
    if (!id) return;

    try {
      const userId = await AsyncStorage.getItem('userid');
      if (!userId) {
        console.error('ID do usuário não encontrado');
        return;
      }

      const userData = await fetchUserData(userId);
      const favoriteAlbums = userData.favoriteAlbums || [];

      let updatedFavorites;
      if (isFavorite) {
        // Remove dos favoritos
        updatedFavorites = favoriteAlbums.filter(albumId => albumId !== id);
      } else {
        // Adiciona aos favoritos
        updatedFavorites = [...favoriteAlbums, id as string];
      }

      // Faz o PATCH para atualizar os favoritos
      const response = await axios.patch(`https://212.85.23.87/users/${userId}`, {
        favoriteAlbums: updatedFavorites
      });

      if (response.status === 200) {
        setIsFavorite(!isFavorite);
        console.log(isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favoritos:', error);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleSavePress = async () => {
    if (!id) return;

    if (isSaved) {
      await UserService.removeFromLocalListenList(id as string);
      setIsSaved(false);
    } else {
      await UserService.addToLocalListenList(id as string[]);
      setIsSaved(true);
    }
  };

  const handleSharePress = () => {
    console.log('Compartilhando álbum...');
  };

  const handleShowAllReviews = () => {
    setShowAllReviews(true);
  };

  // Funções para BottomSheet
  const openBottomSheet = () => setIsBottomSheetVisible(true);
  const closeBottomSheet = () => {
    setIsBottomSheetVisible(false);

  }

  const handleLikePress = () => {
    console.log('Like pressionado!');
    // Aqui você pode adicionar lógica para salvar a avaliação, enviar para API, etc.
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 1);

  if (loading || !album) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#c0c0c0ff', '#a1a1a1ff', '#3b3b3bff', '#000000ff']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#c0c0c0ff', '#a1a1a1ff', '#3b3b3bff', '#000000ff']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.albumHeader}>
            <Image source={{ uri: album.images[0]?.url }} style={styles.albumCover} />
            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle}>{album.name}</Text>
              <Text style={styles.albumArtist}>
                {album.artists[0]?.name} ({new Date(album.release_date).getFullYear()})
              </Text>
              <View style={styles.albumActions}>
                <TouchableOpacity style={styles.albumAction} onPress={handleSavePress}>
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.albumAction} onPress={handleFavoritePress}>
                  <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={24}
                    color={isFavorite ? '#ff6b6b' : 'white'}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.albumAction} onPress={handleSharePress}>
                  <Ionicons name="share-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações do álbum</Text>
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                Gêneros: {album.genres?.join(', ') || 'Não informado'}
              </Text>
              <Text style={styles.descriptionText}>Total de faixas: {album.total_tracks}</Text>
              <Text style={styles.descriptionText}>
                Data de lançamento: {new Date(album.release_date).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <RatingDisplay reviews={reviews} />

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Avaliações {reviews.length > 0 && `(${reviews.length})`}
            </Text>

            {reviews.length === 0 ? (
              <View style={styles.noReviewsContainer}>
                <Text style={styles.noReviewsText}>Ainda não há avaliações para este álbum</Text>
              </View>
            ) : (
              <>
                {displayedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}

                {!showAllReviews && reviews.length > 1 && (
                  <TouchableOpacity style={styles.showMoreButton} onPress={handleShowAllReviews}>
                    <View style={styles.showMoreButtonCircle}>
                      <Ionicons name="chevron-down" size={24} color="white" />
                    </View>
                    <Text style={styles.showMoreText}>
                      Ver mais {reviews.length - 1} avaliações
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        {/* Floating Action Button */}
        <FloatingActionButton onPress={openBottomSheet} />

        {/* Bottom Sheet */}
        <BottomSheet
          visible={isBottomSheetVisible}
          onClose={closeBottomSheet}
          onSuccess={async () => {
            closeBottomSheet();
            await fetchReviews(); // atualiza a lista de avaliações
          }}
          onLikePress={handleLikePress}
          albumId={album.id}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#042714',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
  albumHeader: {
    flexDirection: 'row',
    marginTop: 60,
    marginBottom: 20,
  },
  albumCover: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  albumInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  albumTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 12,
  },
  albumActions: {
    flexDirection: 'row',
  },
  albumAction: {
    marginRight: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 16,
  },
  descriptionText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  ratingContainer: {
    marginVertical: 16,
  },
  ratingTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  ratingContent: {
    alignItems: 'flex-start',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reviewCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  reviewCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 16,
  },
  reviewContent: {
    flex: 1,
  },
  reviewHeader: {
    marginBottom: 8,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 8,
  },
  reviewComment: {
    color: 'white',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  reviewActions: {
    flexDirection: 'row',
  },
  reviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  reviewActionText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  noReviewsContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noReviewsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  showMoreButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  showMoreButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  showMoreText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default AlbumDetailScreen;