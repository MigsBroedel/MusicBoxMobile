import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

interface Album {
  id: string;
  name: string;
  imageUrl: string;
  artistName: string;
}

export default function PopularAlbums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularAlbums = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) {
          console.log("Token não encontrado");
          setLoading(false);
          return;
        }

        // Playlist Top 50 Global (id fixo do Spotify)
        const playlistId = "37i9dQZEVXbMDoHDwVN2tF";

        // Buscar tracks da playlist
        const response = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const items = response.data.items;

        // Extrair álbuns únicos dos tracks (pode ter repetidos)
        const albumsMap = new Map<string, Album>();

        for (const item of items) {
          const track = item.track;
          if (!track) continue;

          const album = track.album;
          if (!album) continue;

          if (!albumsMap.has(album.id)) {
            albumsMap.set(album.id, {
              id: album.id,
              name: album.name,
              imageUrl: album.images[0]?.url || "",
              artistName: album.artists.map((a: any) => a.name).join(", "),
            });
          }
        }

        setAlbums(Array.from(albumsMap.values()));
      } catch (error) {
        console.error("Erro ao buscar álbuns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularAlbums();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (albums.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>Nenhum álbum encontrado.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={albums}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.albumContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.albumImage} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.albumName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {item.artistName}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  albumContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 8,
  },
  albumImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  albumName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  artistName: {
    fontSize: 14,
    color: "#ccc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
