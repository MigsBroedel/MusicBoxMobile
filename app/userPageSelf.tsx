import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View, Dimensions, Text, Image, TouchableOpacity, ActivityIndicator, Share } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from 'react-native-elements';
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { ReviewCardLong } from "../components/reviewCardLong";
import axios from "axios";
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
  const newHex =
    '#' +
    [r, g, b]
      .map(x => {
        const h = Math.round(x).toString(16);
        return h.length === 1 ? '0' + h : h;
      })
      .join('');
  return newHex;
}

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

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const AlbumItem = ({ item }: { item: Album }) => (
  <TouchableOpacity style={styles.historyItem}>
    <Image source={{ uri: item.image }} style={styles.historyImage} />
  </TouchableOpacity>
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

export default function UserPage() {
  const router = useRouter();
  const [Color, setColor] = useState("#fff");
  const [userId, setUserId] = useState<string | null>(null);
  const [token, settoken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        title: 'Confira este perfil!',
        message: `Dá uma olhada nesse perfil: https://musicbox.com/userPageShare/${userId}`,
        url: `https://musicbox.com/userPageShare/${userId}`, // para iOS
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Compartilhado com uma atividade específica
          console.log('Compartilhado com atividade:', result.activityType);
        } else {
          // Compartilhado
          console.log('Compartilhado com sucesso');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Compartilhamento cancelado');
      }
    } catch (error) {
      alert('Erro ao compartilhar');
    }
  }

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const resp = await fetch(`https://212.85.23.87/users/${id}`);
      if (!resp.ok) throw new Error("Erro ao buscar usuário");
      const data: UserProfile = await resp.json();
      setUser(data);
      setColor(data.colors || "#fff");

      // Buscar contadores em paralelo
      const [followersRes, followingRes] = await Promise.all([
        fetch(`https://212.85.23.87/followers/count/${id}`),
        fetch(`https://212.85.23.87/following/count/${id}`)
      ]);

      if (followersRes.ok) {
        const followers = await followersRes.json();
        setFollowersCount(followers);
      }

      if (followingRes.ok) {
        const following = await followingRes.json();
        setFollowingCount(following);
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

      promises.push(fetchUserReviews(id));
      
      // Aguardar todas as promises
      await Promise.allSettled(promises);

    } catch (err) {
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
      const resp = await axios.get(`https://212.85.23.87/review/user/${userId}`);
      
      const arr: Review[] = await resp.data
      console.log(resp.data)
      setReviews(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("Erro ao buscar reviews:", err);
      setReviews([]);
    }
  };

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("userid");
      const at = await AsyncStorage.getItem("accessToken");
      settoken(at)
      if (id) {
        setUserId(id);
        await fetchUser(id);
      } else {
        setError("ID do usuário não encontrado");
        setLoading(false);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) fetchUser(userId);
    }, [userId])
  );

  if (loading) return (
    <View style={[styles.container, styles.centerContent]}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.loadingText}>Carregando perfil...</Text>
    </View>
  );
  if (error || !user) return (
    <View style={[styles.container, styles.centerContent]}>
      <Text style={styles.errorText}>Erro: {error}</Text>
      <Button title="Tentar novamente" onPress={() => userId && fetchUser(userId)} buttonStyle={styles.retryButton} />
    </View>
  );

  const darker = shadeColor(Color, -0.5);
  const darkerer = shadeColor(Color, -0.7);
  const lighter = shadeColor(Color, 0.5);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <LinearGradient colors={[Color, darker, lighter, darkerer]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
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
                  <TouchableOpacity 
                    onPress={() => router.push({
                      pathname: "followersPage",
                      params: { userId: userId, type: "followers" }
                    })}
                  >
                    <Text style={styles.followText}>{followersCount} seguidores</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => router.push({
                      pathname: "followersPage", 
                      params: { userId: userId, type: "following" }
                    })}
                  >
                    <Text style={styles.followText}>{followingCount} seguindo</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>
            <Button title="Editar perfil" onPress={() => router.push("editUserPage" as any)} buttonStyle={[styles.editButton, { backgroundColor: darker }]} titleStyle={styles.editButtonText} />
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
                  <Text style={styles.emptyStateText}>Sem álbuns favoritos</Text>
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
                  <Text style={styles.emptyStateText}>Sem artistas favoritos</Text>
                </View>
              )}
            </Section>

            {/* Reviews section */}
            <Section title="Reviews Recentes">
              {reviews.length > 0 ? (
                <>
                  {reviews.slice(0, 3).map(r => (
                    <ReviewCardLong nota={r.nota} albumid={r.albumid} id={r.id} likes={r.likes} text={r.text} key={r.id} user={r.user} createdAt={r.createdAt}/>
                  ))}
                  <Button
                    title="Ver todas as reviews"
                    onPress={() => router.push({
                      pathname: "userReviewsPage",
                      params: {
                        userid: userId
                      }
                  
                    })}
                    buttonStyle={styles.reviewButton}
                  />
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Ainda sem reviews</Text>
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
  container: { flex: 1 },
  centerContent: { justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  loadingText: { color: "white", marginTop: 10, fontSize: 16 },
  errorText: { color: "white", fontSize: 16, textAlign: "center", marginBottom: 20 },
  retryButton: { backgroundColor: "#333", borderRadius: 8, paddingHorizontal: 20 },
  scrollContainer: { flex: 1 },
  mainView: { paddingVertical: 20, paddingHorizontal: 20, paddingBottom: 30, zIndex: 1 },
  section1: { flexDirection: "row", alignItems: "center", marginBottom: 30, paddingTop: 40 },
  profileInfo: { flex: 1, marginLeft: 20 },
  textName: { color: "white", fontWeight: "bold", fontSize: 28, marginBottom: 8 },
  followInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  followText: {
    color: 'white',
    fontSize: 16,
  },
  bioText: { color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 20 },
  shareButton: { padding: 8 },
  img: { width: 120, height: 120, borderRadius: 15, borderWidth: 3, borderColor: "rgba(255,255,255,0.3)" },
  editButton: { borderRadius: 25, paddingVertical: 12, paddingHorizontal: 30 },
  editButtonText: { fontSize: 16, fontWeight: "600" },
  contentContainer: { paddingTop: 20 },
  section: { marginBottom: 30, gap: 10, paddingHorizontal: 10 },
  sectionTitle: { color: "white", fontSize: 20, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 16 },
  horizontalScroll: { paddingLeft: 20 },
  historyContainer: { flexDirection: "row", gap: 12, paddingRight: 20 },
  historyItem: { flex: 1 },
  historyImage: { width: 150, height: 150, borderRadius: 8 },
  artistsContainer: { flexDirection: "row", gap: 20, paddingRight: 20 },
  artistItem: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 10, gap: 10 },
  artistImage: { width: 100, height: 100, borderRadius: 40 },
  artistName: { fontSize: 15, fontWeight: "900", color: "white" },
  emptyState: { alignItems: "center", backgroundColor: "#03030355", borderRadius: 15, marginHorizontal: 20, paddingVertical: 40, paddingHorizontal: 20 },
  emptyStateText: { color: "white", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  reviewItem: { marginBottom: 16, paddingHorizontal: 20 },
  reviewText: { color: "white", fontSize: 16, fontStyle: "italic" },
  reviewMeta: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 },
  reviewButton: { backgroundColor: "#444", borderRadius: 20, alignSelf: "center", marginTop: 10, paddingHorizontal: 24, paddingVertical: 8 },
});