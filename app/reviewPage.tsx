import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import ReviewService from '../services/reviewService';
import ReviewType from '../types/reviewType';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpotifyAlbum } from '../types/spotifyAlbumType';

const { width, height } = Dimensions.get('window');

// Componente para o botão de ouvir no Spotify
const SpotifyButton = () => {
  return (
    <TouchableOpacity style={styles.spotifyButton}>
      <Text style={styles.spotifyButtonText}>Ouvir no Spotify</Text>
    </TouchableOpacity>
  );
};

// Componente para as ações de interação
const InteractionBar = () => {  
  return (
    <View style={styles.interactionBar}>
      <TouchableOpacity style={styles.interactionButton}>
        <Ionicons name="heart-outline" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.interactionButton}>
        <Ionicons name="chatbubble-outline" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.interactionButton}>
        <Ionicons name="share-social-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default function ReviewScreen() {
  const { id } = useLocalSearchParams();
  const [review, setReview] = useState<ReviewType | null>(null);
  
  const [album, setAlbum] = useState<SpotifyAlbum>()

  useEffect(() => {
    const fetchReview = async () => {
      try {
        if (!id) return;
        const response = await ReviewService.getReviewsByUserId(id as string);
        console.log("respo", response);
        setReview(response);
        setReviewText(response.text);
      } catch (error) {
        console.error("Erro ao buscar review:", error);
      }
    };

    fetchReview();
  }, [id]);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        if (!review?.albumid) return;

        const token = await AsyncStorage.getItem('accessToken'); // ✅ aqui sim
        if (!token) {
          console.error("Token de acesso não encontrado");
          return;
        }

        const response = await fetch(`https://api.spotify.com/v1/albums/${review.albumid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("data", data);
        setAlbum(data);
      } catch (error) {
        console.error("Erro na busca do álbum:", error);
      }
    };

    if (review) fetchAlbum(); // só chama se review estiver carregado
  }, [review]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const [reviewText, setReviewText] = useState('');
  
  // Dados do álbum (normalmente viriam dos parâmetros da rota)
  // Aqui estamos usando dados estáticos para demonstração

  
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(50,205,50,0.2)']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review by shine</Text>
        </View>
        
        <ScrollView style={styles.content}>
          {/* Album Info */}
          <View style={styles.topContainer}>
            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle}>{album?.name}</Text>
              <Text style={styles.albumArtist}>({album?.release_date})</Text>
            </View>
          
          {/* Album Cover */}
            <View style={styles.albumCoverContainer}>
              <Image source={{ uri: album?.images[0]?.url }} style={styles.albumCover} height={150} width={150}/>
              <SpotifyButton />
            </View>
          </View>
          
          {/* Review Text */}
          <View style={styles.reviewContainer}>
            <TextInput
              style={styles.reviewText}
              multiline
              placeholder={review?.text}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={reviewText}
              onChangeText={setReviewText}
            />
          </View>
          
          {/* Divider */}
          <View style={styles.divider} />
          
          {/* Interaction Bar */}
          <InteractionBar />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20

  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  albumInfo: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: "center"
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
  },
  albumCoverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  albumCover: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 8,
  },
  spotifyButtonContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  spotifyButton: {
    backgroundColor: '#1DB954', // Spotify green
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 15,
  },
  spotifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewContainer: {
    marginBottom: 24,
  },
  reviewText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 24,
  },
  interactionButton: {
    padding: 8,
  },
});