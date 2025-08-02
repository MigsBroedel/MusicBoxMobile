import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useState, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SpotifyResult = {
  id: string;
  name: string;
  image: string;
  type: "album" | "artist"; // ou só "album", se for o caso
};


const spotifyGetAlbum = async (query: string) => {
  if (!query) return [];

  const token = await AsyncStorage.getItem("accessToken");
  if (!token) return [];

  const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=album,artist`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  const albums = data.albums?.items || [];
  const artists = data.artists?.items || [];

  return [...albums, ...artists].map((item) => ({
    id: item.id,
    name: item.name,
    image: item.images?.[0]?.url ?? '',
    type: item.type,
  }));
};

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyResult[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length > 2) {
        spotifyGetAlbum(query).then(setResults);
        setShowOverlay(true);
      } else {
        setShowOverlay(false);
        setResults([]);
      }
    }, 500); // debounce de 500ms

    return () => clearTimeout(timeout);
  }, [query]);

  console.log(results)

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        placeholder="Buscar artista ou álbum"
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />

      {showOverlay && (
        <View style={styles.overlay}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item}>
                
                {item.image ? (
                <Image 
                    source={{ uri: item.image }} 
                    style={styles.image} // Use o estilo que você já definiu
                />
                ) : null}
                <Text style={styles.name}>{item.name}</Text>
              </TouchableOpacity>
            )}
            style={styles.list}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    fontSize: 10,
    borderColor: '#ccc',
    backgroundColor: "#f0f0f0"
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 999,
  },
  list: {
    gap: 10
    
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginVertical: 5,
    borderRadius: 5,
    backgroundColor: "#3f3e3eff"
  },
  image: {
    width: 48,
    height: 48,
    marginRight: 10,
    borderRadius: 4,
  },
  name: {
    fontSize: 16,
    color: 'white'
  },
});
