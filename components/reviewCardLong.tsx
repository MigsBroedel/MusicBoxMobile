import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, View, Image, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import ReviewType from "../types/reviewType";

type AlbumImage = {
  url: string;
  height: number;
  width: number;
};

type Album = {
  id: string;
  name: string;
  images: AlbumImage[];
  artists: { name: string }[];
  release_date: string;
};

export function ReviewCardLong({ albumid, id, nota, likes, text }: ReviewType) {
  const [album, setAlbum] = useState<Album | null>(null);
  const { userid } = useLocalSearchParams()

  useEffect(() => {
    const fetchAlbum = async () => {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) return;

      try {
        const response = await fetch(`https://api.spotify.com/v1/albums/${albumid}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data = await response.json();
        setAlbum(data);
      } catch (error) {
        console.error("Erro ao buscar álbum:", error);
      }
    };

    fetchAlbum();
  }, [albumid]);

  if (!album) return null;

  return (
    <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: "reviewPage",
            params: { userid: userid },
          })
        }
        }
      >
    <View style={styles.container}>
      
        <Image
          style={styles.image}
          source={{ uri: album.images[0].url }}
          resizeMode="cover"
        />
      

      <View style={styles.rightPart}>
        <Text style={styles.albumName}>{album.name}</Text>
        <Text style={styles.artistName}>{album.artists.map(a => a.name).join(', ')}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {[...Array(5)].map((_, index) => (
            <Ionicons
              key={index}
              name={index < Math.round(nota / 2) ? "star" : "star-outline"}
              size={20}
              color="#FFF"
            />
          ))}
        </View>

        <Text style={styles.reviewText}>{text}</Text>
      </View>
    </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "space-around",
    padding: 16,
    flexDirection: 'row',
    backgroundColor: '#03030355',
    borderRadius: 20
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  albumName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
  artistName: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  reviewText: {
    color: '#f6f6f690',
    marginTop: 8,
    textAlign: 'center',
  },
  rightPart: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});
