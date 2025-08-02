import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, View, Image, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import ReviewType from "../types/reviewType";

export function ReviewCard({ albumid, id, nota, user }: ReviewType) {
  const [albumCoverUrl, setAlbumCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("accessToken");
        if (!accessToken) {
          console.warn("Access token não encontrado.");
          return;
        }

        const response = await fetch(`https://api.spotify.com/v1/albums/${albumid}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar álbum do Spotify");
        }

        const data = await response.json();
        const imageUrl = data?.images?.[0]?.url;

        if (imageUrl) {
          setAlbumCoverUrl(imageUrl);
        } else {
          console.warn("Imagem do álbum não encontrada.");
        }
      } catch (error) {
        console.error("Erro ao buscar dados do álbum:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [albumid]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1DB954" />
      </View>
    );
  }

  if (!albumCoverUrl) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: "reviewPage",
            params: {
              id,
            },
          });
        }}
      >
        <Image
          style={styles.image}
          source={{ uri: albumCoverUrl }}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Nome do usuário (placeholder) */}
      <View style={styles.userInfo}>
        <Image src={user.pfp} width={30} height={30} borderRadius={30}/>
        <Text style={styles.username}>{user.name}</Text>
      </View>

      {/* Nota em estrelas */}
      <View style={styles.stars}>
        {[...Array(5)].map((_, index) => (
          <Ionicons
            key={index}
            name={index < Math.round(nota / 2) ? "star" : "star-outline"}
            size={20}
            color="#FFF"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 6,
  },
  stars: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
