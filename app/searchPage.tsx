import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, SafeAreaView, View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useState, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

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
};

const spotifyGetAlbum = async (query: string, type: string) => {
  if (!query) return [];

  const token = await AsyncStorage.getItem("accessToken");
  if (!token) return [];

  const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=${type}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  let results: any[] = [];

  // Se estamos buscando albums/singles
  if (type.includes('album')) {
    const albums = data.albums?.items || [];
    results = [...results, ...albums];
  }

  // Se estamos buscando artistas
  if (type.includes('artist')) {
    const artists = data.artists?.items || [];
    results = [...results, ...artists];
  }

  return results.map((item) => ({
    id: item.id,
    name: item.name,
    image: item.images?.[0]?.url ?? '',
    type: item.type,
  }));
};

function SearchBar({ activeTab }: { activeTab: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyResult[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length > 2) {
        // Determina o tipo de busca baseado na tab ativa
        const searchType = activeTab === 0 ? 'album' : 'artist';
        spotifyGetAlbum(query, searchType).then(setResults);
        setShowOverlay(true);
      } else {
        setShowOverlay(false);
        setResults([]);
      }
    }, 500); // debounce de 500ms

    return () => clearTimeout(timeout);
  }, [query, activeTab]); // Adiciona activeTab como dependência

  console.log(results);

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        placeholder={activeTab === 0 ? "Buscar álbuns e singles" : "Buscar artistas"}
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
              <TouchableOpacity style={styles.item} onPress={() => {
                if (activeTab == 0) {
                  router.push({pathname: "albumPage", params: {
                id: item.id
              }})
                
                }
                else {
                  router.push({pathname: "artistPage", params: {
                artistId: item.id
              }})
                }
              }}>
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
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.type}>
                    {item.type === 'artist' ? 'Artista' : 
                     item.type === 'album' ? 'Álbum' : 'Single'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.list}
          />
        </View>
      )}
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

const styles = StyleSheet.create({
  container: {
    padding: 30,
    paddingTop: 50,
    backgroundColor: "#0f0f0f",
    flex: 1,
  },
  input: {
    fontSize: 16,
    borderColor: '#ccc',
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
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
    backgroundColor: "#1db954", // Cor verde do Spotify
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
  type: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
});