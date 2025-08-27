import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View, Dimensions, StatusBar, Text, Image, TouchableOpacity, ActivityIndicator} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from 'react-native-elements';
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReviewCardLong } from "../components/reviewCardLong";
import Review from "../types/reviewType";

const { width } = Dimensions.get('window');

function shadeColor(hex: string, percent: number): string {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.min(255, Math.max(0, r + (r * percent)));
  g = Math.min(255, Math.max(0, g + (g * percent)));
  b = Math.min(255, Math.max(0, b + (b * percent)));
  const newHex = '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
  return newHex;
}

const AlbumItem = ({ item }: { item: Album }) => (
  <TouchableOpacity style={styles.historyItem}>
    <Image source={{ uri: item.image }} style={styles.historyImage} />
    <Text style={styles.albumTitle} numberOfLines={2}>{item.title}</Text>
    <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
  </TouchableOpacity>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ArtistItem = ({ artist }: { artist: Artist }) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.artistItem}
      onPress={() =>
        router.push({
          pathname: "artistPage",
          params: { artistId: artist.id },
        })
      }
    >
      <Image
        source={{ uri: artist.images[0]?.url }}
        style={styles.artistImage}
      />
      <Text style={styles.artistName}>{artist.name}</Text>
    </TouchableOpacity>
  );
};

type Album = {
  id: string;
  title: string;
  artist: string;
  image: string;
};

type Artist = {
  id: string;
  name: string;
  images: { url: string }[];
};



type UserProfile = {
  id: string;
  name: string;
  bio: string;
  spotifyID: string;
  colors: string;
  pfp: string;
  favoriteAlbums: string[] | null;
  favoriteArtists: string[] | null;
};

async function isUserFollowed(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://212.85.23.87/followers/${targetUserId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Erro na requisição: ${response.status}`);
      return false;
    }
    
    const data = await response.json();

    if (!Array.isArray(data)) {
      console.warn("Resposta inesperada:", data);
      return false;
    }

    const found = data.some((follower: any) => follower.id === currentUserId);
    return found;
  } catch (error) {
    console.error("Erro ao verificar seguidores:", error);
    return false;
  }
}

export default function UserPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Garantir que id seja uma string
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [user, setUser] = useState<UserProfile>();
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const storedId = await AsyncStorage.getItem("userid");
      setCurrentUserId(storedId);

      // Buscar dados do usuário
      const res = await fetch(`https://212.85.23.87/users/${userId}`);
      if (!res.ok) throw new Error(`Erro ao buscar usuário: ${res.status}`);
      const data = await res.json();
      setUser(data);

      // Buscar contadores em paralelo
      const [followersRes, followingRes] = await Promise.all([
        fetch(`https://212.85.23.87/followers/count/${userId}`),
        fetch(`https://212.85.23.87/following/count/${userId}`)
      ]);

      if (followersRes.ok) {
        const followers = await followersRes.json();
        setFollowersCount(followers);
      }

      if (followingRes.ok) {
        const following = await followingRes.json();
        setFollowingCount(following);
      }

      // Verificar se está seguindo apenas se não for o próprio usuário
      if (storedId && storedId !== userId) {
        try {
          const checkFollow = await isUserFollowed(storedId, userId);
          setIsFollowing(checkFollow);
        } catch (err) {
          console.warn("Erro ao verificar follow status:", err);
          setIsFollowing(false);
        }
      }

      // Buscar dados adicionais em paralelo
      const promises = [];
      
      if (data.favoriteAlbums?.length) {
        promises.push(fetchFavoriteAlbums(data.favoriteAlbums));
      } else {
        setFavoriteAlbums([]);
      }

      if (data.favoriteArtists?.length) {
        promises.push(fetchFavoriteArtists(data.favoriteArtists));
      } else {
        setFavoriteArtists([]);
      }

      promises.push(fetchUserReviews(userId));
      
      // Aguardar todas as promises
      await Promise.allSettled(promises);

    } catch (err) {
      console.error("Erro em fetchUser:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteAlbums = async (albumIds: string[]) => {
  try {
    const token = await AsyncStorage.getItem("accessToken"); // <-- AQUI
    if (!token) {
      console.warn("Token de acesso não encontrado");
      setFavoriteAlbums([]);
      return;
    }

    const promises = albumIds.map(async (id) => {
      try {
        const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(response);
        if (!response.ok) throw new Error(`Erro ao buscar álbum ${id}`);
        return await response.json();
      } catch (err) {
        console.warn(`Erro ao buscar álbum ${id}:`, err);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    const albums = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter(Boolean);

    const mapped: Album[] = albums.map((a: any) => ({
      id: a.id,
      title: a.name || "Sem título",
      artist: a.artists?.[0]?.name || "Desconhecido",
      image: a.images?.[0]?.url || "https://via.placeholder.com/150x150/333333/FFFFFF?text=Album",
    }));

    setFavoriteAlbums(mapped);
  } catch (err) {
    console.error("Erro ao buscar álbuns favoritos:", err);
    setFavoriteAlbums([]);
  }
};


  const fetchFavoriteArtists = async (artistIds: string[]) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        console.warn("Token de acesso não encontrado");
        setFavoriteArtists([]);
        return;
      }

      const promises = artistIds.map(async (id) => {
        try {
          const response = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) throw new Error(`Erro ao buscar artista ${id}`);
          return await response.json();
        } catch (err) {
          console.warn(`Erro ao buscar artista ${id}:`, err);
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      const artists = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter(Boolean);

      setFavoriteArtists(artists);
    } catch (err) {
      console.error("Erro ao buscar artistas favoritos:", err);
      setFavoriteArtists([]);
    }
  };

  const fetchUserReviews = async (userId: string) => {
    try {
      const resp = await fetch(`https://212.85.23.87/review/user/${userId}`);
      if (!resp.ok) throw new Error(`Erro ao buscar reviews: ${resp.status}`);
      const arr: Review[] = await resp.json();
      setReviews(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("Erro ao buscar reviews:", err);
      setReviews([]);
    }
  };

  const followUser = async (idFollowing: string) => {
    const userId = await AsyncStorage.getItem('userid');
    if (!userId) return;
    
    try {
      const res = await fetch(`https://212.85.23.87/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: userId,
          followingId: idFollowing
        })
      });

      if (res.ok) {
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Erro ao seguir usuário:", err);
    }
  };

  const unfollowUser = async (idFollowing: string) => {
    const userId = await AsyncStorage.getItem('userid');
    if (!userId) return;
    
    try {
      const res = await fetch(`https://212.85.23.87/unfollow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: userId,
          followingId: idFollowing
        })
      });

      if (res.ok) {
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      }
    } catch (err) {
      console.error("Erro ao deixar de seguir usuário:", err);
    }
  };

  // ADICIONADO: useEffect para chamar fetchUser
  useEffect(() => {
    if (id) {
      fetchUser(id);
    }
  }, [id]);

  // Verificar se id existe
  if (!id) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>ID do usuário não encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#1DB954', fontSize: 16 }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  // Error state  
  if (error || !user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Erro: {error}</Text>
        <Button 
          title="Tentar novamente" 
          onPress={() => id && fetchUser(id)} 
          buttonStyle={styles.retryButton} 
        />
      </View>
    );
  }

  const color: string = user.colors;
  const darker = shadeColor(color, -0.5);
  const darkerer = shadeColor(color, -0.7);
  const lighter = shadeColor(color, 0.3);

  // Verificar se é o próprio usuário
  const isOwnProfile = currentUserId === id;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <LinearGradient colors={[color, darker, lighter, darkerer]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
          <SafeAreaView style={styles.mainView}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" color="white" size={24} />
            </TouchableOpacity>
            <View style={styles.section1}>
              <Image source={{ uri: user.pfp }} style={styles.img} />
              <View style={styles.profileInfo}>
                <Text style={styles.textName}>{user.name}</Text>
                {user.bio && <Text style={styles.bioText}>{user.bio}</Text>}
                <View style={styles.followInfo}>
                  <Text style={styles.followText}>{followersCount} seguidores</Text>
                  <Text style={styles.followText}>{followingCount} seguindo</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="share-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Mostrar botão de seguir apenas se não for o próprio perfil */}
            {!isOwnProfile && (
              <Button
                title={isFollowing ? "Seguindo" : "Seguir"}
                onPress={() => {
                  if (isFollowing) {
                    unfollowUser(id);
                  } else {
                    followUser(id);
                  }
                }}
                buttonStyle={[
                  styles.editButton, 
                  { backgroundColor: isFollowing ? '#666' : darker }
                ]}
                titleStyle={styles.editButtonText}
              />
            )}

        
          </SafeAreaView>

          <View style={styles.contentContainer}>
            {/* Albums section */}
            <Section title="Álbuns Favoritos">
              {favoriteAlbums.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  <View style={styles.historyContainer}>
                    {favoriteAlbums.map((album, i) => <AlbumItem key={`album-${album.id}-${i}`} item={album} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ color: 'white' }}>Sem álbuns favoritos</Text>
                </View>
              )}
            </Section>

            {/* Artists section */}
            <Section title="Artistas Favoritos">
              {favoriteArtists.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  <View style={styles.artistsContainer}>
                    {favoriteArtists.map((a, i) => <ArtistItem key={`artist-${a.id}-${i}`} artist={a} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ color: 'white' }}>Sem artistas favoritos</Text>
                </View>
              )}
            </Section>

            {/* Reviews section */}
            <Section title="Reviews Recentes">
              {reviews.length > 0 ? (
                <>
                  {reviews.slice(0, 3).map(r => (
                    <ReviewCardLong 
                      nota={r.nota} 
                      albumid={r.albumid} 
                      id={r.id} 
                      likes={r.likes} 
                      text={r.text} 
                      key={r.id}
                      user={r.user}
                      createdAt={r.createdAt}
                    />
                  ))}
                  <Button
                    title="Ver todas as reviews"
                    onPress={() => router.push({
                      pathname: "userReviewsPage",
                      params: {
                        userid: id
                      }
                    })}
                    buttonStyle={styles.reviewButton}
                  />
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ color: 'white' }}>Ainda sem reviews</Text>
                </View>
              )}
            </Section>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#121212'
  },
  scrollContainer: { flex: 1 },
  mainView: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  section1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 40,
  },
  reviewButton: { backgroundColor: "#444", borderRadius: 20, alignSelf: "center", marginTop: 10, paddingHorizontal: 24, paddingVertical: 8 },
  profileInfo: { flex: 1, marginLeft: 20 },
  textName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 8,
  },
  followInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  followText: {
    color: 'white',
    fontSize: 16,
  },
  img: {
    width: 120,
    height: 120,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editButton: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  centerContent: { 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#121212" 
  },
  loadingText: { 
    color: "white", 
    marginTop: 10, 
    fontSize: 16 
  },
  errorText: { 
    color: "white", 
    fontSize: 16, 
    textAlign: "center", 
    marginBottom: 20 
  },
  retryButton: { 
    backgroundColor: "#1DB954", 
    borderRadius: 8, 
    paddingHorizontal: 20 
  },
  
  bioText: { 
    color: "rgba(255,255,255,0.8)", 
    fontSize: 14, 
    lineHeight: 20,
    marginBottom: 8
  },
  shareButton: { 
    padding: 8 
  },
  
  contentContainer: { 
    paddingTop: 20 
  },
  section: { 
    marginBottom: 30,
    gap: 10,
    paddingHorizontal: 10
  },
  sectionTitle: { 
    color: "white", 
    fontSize: 20, 
    fontWeight: "bold", 
    paddingHorizontal: 20, 
    marginBottom: 16 
  },
  horizontalScroll: { 
    paddingLeft: 20 
  },
  historyContainer: { 
    flexDirection: "row", 
    gap: 12, 
    paddingRight: 20 
  },
  historyItem: { 
    flex: 1,
    width: 150
  },
  historyImage: { 
    width: 150, 
    height: 150, 
    borderRadius: 8,
    marginBottom: 8
  },
  albumTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4
  },
  albumArtist: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12
  },
  artistsContainer: { 
    flexDirection: "row", 
    gap: 20, 
    paddingRight: 20 
  },
  artistItem: { 
    alignItems: "center", 
    paddingVertical: 20, 
    paddingHorizontal: 10, 
    gap: 10 
  },
  artistImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 50 
  },
  artistName: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "white",
    textAlign: "center"
  },
  emptyState: { 
     alignItems: "center", backgroundColor: "#03030355", borderRadius: 15, marginHorizontal: 20, paddingVertical: 40, paddingHorizontal: 20 
  }
})