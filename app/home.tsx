import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReviewCard } from '../components/reviewCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Sidebar from '../components/sideBar';
import ReviewService from '../services/reviewService';
import UserService from '../services/userService';
import Review from '../types/reviewType';
import axios from 'axios';

const { width } = Dimensions.get('window');

type Album = {
  id: string;
  title: string;
  artist: string;
  images: {
    url: string
  }[];
};

const TabBar = ({ activeTab, setActiveTab }: { activeTab: number; setActiveTab: (i: number) => void }) => {
  const tabs = ['Álbums e Singles', 'Reviews', 'Acervo'];

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab, index) => (
        <TouchableOpacity key={index} style={[styles.tab, activeTab === index && styles.activeTab]} onPress={() => setActiveTab(index)}>
          <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const FloatingActionButton = () => {
  return (
    <TouchableOpacity style={styles.fab}>
      <Ionicons name="add" size={24} color="white" />
    </TouchableOpacity>
  );
};

// ... (imports e TabBar e FloatingActionButton mantidos como estão)

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchReviewsFromFollowing = async () => {
      try {
        setLoading(true);
        const id = await AsyncStorage.getItem('userid');
        if (!id) return;
        setUserId(id);

        const response = await ReviewService.getReviewsFromFollowing([id]);
        if (Array.isArray(response)) setReviews(response);
        else setReviews([]);
      } catch (error) {
        console.error('Erro ao buscar reviews dos amigos:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewsFromFollowing();
  }, []);

  useEffect(() => {
    const fetchFamousAlbuns = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) return;

        const response = await axios.get(`https://api.spotify.com/v1/browse/new-releases?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAlbuns(response.data.albums.items);
      } catch (error) {
        console.error('Erro ao buscar álbuns populares:', error);
      }
    };

    fetchFamousAlbuns();
  }, []);

  const renderTabContent = () => {
    if (activeTab === 0) {
      // Álbuns e Singles
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Populares da Semana</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.albumList}>
            {albuns.map((album) => (
              <View key={album.id} style={styles.albumCard}>
                <TouchableOpacity onPress={() => router.push(`/albumPage/${album.id}`)}>
                  <Image source={{ uri: album.images[0]?.url }} style={styles.albumCover} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (activeTab === 1) {
      // Reviews
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimas reviews de amigos</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Carregando reviews...</Text>
            </View>
          ) : reviews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.albumList}>
              {reviews.map((item, index) => (
                <ReviewCard 
                  key={index}
                  albumid={item.albumid}
                  user={item.user}
                  nota={item.nota}
                  id={item.id}
                  likes={item.likes}
                  text={item.text}
                  createdAt={item.createdAt}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhuma review encontrada.
                {'\n'}Comece seguindo alguns usuários!
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (activeTab === 2) {
      // Acervo
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seu Acervo</Text>
          <Text style={{ color: '#999', paddingHorizontal: 16 }}>
            Em breve: você poderá ver listas de albuns, criados pelos usuarios.
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sidebar />
        </View>
        <View style={styles.headerCenter} />
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('searchPage')}>
            <Ionicons name="search-outline" size={25} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('userPageSelf')}>
            <Ionicons name="person-circle-outline" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <ScrollView style={styles.content}>
        {renderTabContent()}
      </ScrollView>

      
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {},
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row' },
  headerIcon: { marginLeft: 16 },

  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-around',
    zIndex: 0,
  },
  tab: {
    backgroundColor: '#222',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  activeTab: {
    backgroundColor: 'white',
  },
  tabText: {
    color: '#999',
    fontSize: 14,
  },
  activeTabText: {
    color: 'black',
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
    zIndex: 0,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  albumList: {
    paddingLeft: 16,
  },
  albumCard: {
    width: 120,
    marginRight: 12,
  },
  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  albumArtist: {
    color: '#999',
    fontSize: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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