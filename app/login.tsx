import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground, Button } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import UserService from '../services/userService';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

// Spotify OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function LoginScreen() {
  const navigation = useNavigation();
  // Configure AuthRequest
  const redirectUri = AuthSession.makeRedirectUri({  scheme: "musicbox" });
  console.log(redirectUri)
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: 'f1279cc7c8c246f49bad620c58811730', // TODO: replace with your Spotify Client ID
      scopes: ['user-read-email', 'user-library-read'],
      redirectUri,
      responseType: 'code',
    },
    discovery
  );

  // Handle Spotify OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const code = response.params.code;
      console.log('Login com Spotify bem-sucedido!');

      console.log("login gfeito")
    } else if (response?.type === 'error') {
      console.log('Falha no login com Spotify.', response);
    }
  }, [response, navigation]);


  useEffect(() => {
  if (response?.type === 'success') {
    const code = response.params.code;
    const codeVerifier = request?.codeVerifier
    console.log(code)

    fetch(`https://musicboxdback.onrender.com/auth/callback?code=${code}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, codeVerifier }),
    })
      
      .then(async res => {
        if (!res.ok) {
          console.log("res", res)
          throw new Error('Falha na troca de código');
        }
        const data = await res.json();
        console.log('Tokens recebidos:', data);
        const { access_token, refresh_token } = data;
        await AsyncStorage.setItem("accessToken", access_token);
        await AsyncStorage.setItem("refreshToken", refresh_token);

        // Agora aguarda os dados do /me
        const meResponse = await fetch(
          `https://api.spotify.com/v1/me`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );



        if (!meResponse.ok) {
          throw new Error('Falha ao buscar dados do usuário');
        }

        const meData = await meResponse.json();
        console.log(meData)
        try {
          const encodedName = encodeURIComponent(meData.display_name);
          const userRes = await axios.post(`https://musicboxdback.onrender.com/users/logProcess/${meData.id}?name=${encodedName}`);
          if (!userRes.data) {
            // Pegue o texto ou json para entender o erro
            const errorText = await userRes.statusText;
            throw new Error(`Erro ao buscar/criar usuário: ${userRes.status} - ${errorText}`);
          }

          const user = await userRes.data;
          console.log('Usuário recuperado/criado:', user);

          await AsyncStorage.setItem('userid', user.id);
          await AsyncStorage.setItem('username', user.display_name || '');
          await AsyncStorage.setItem('spotifyID', user.spotifyID);

          router.replace('home');
        } catch (err) {
          console.error('Erro ao buscar/criar usuário:', err);
        }});
  }
}, [response]);

  const handleSpotifyLogin = () => {
    // Trigger Spotify OAuth flow
    promptAsync();
  };

  return (
    
      <View style={styles.overlay}>
        {/* Liquid Glass Effect Container */}
        <BlurView intensity={30} tint="dark" style={styles.glassContainer}>
          <LinearGradient
            colors={['rgba(10, 17, 0, 0.99)', 'rgba(34, 34, 34, 1)']}
            style={styles.gradientOverlay}
          />
          
          <View style={styles.contentContainer}>
            <Ionicons name="headset" size={30} color={"white"}/>
            <Text style={styles.title}>Music Rater</Text>
            <Text style={styles.subtitle}>Avalie suas músicas favoritas</Text>
            
            {/* Spotify Login Button with Liquid Glass Effect */}
            <TouchableOpacity 
              style={styles.spotifyButton}
              onPress={handleSpotifyLogin}
              activeOpacity={0.8}
            >
              <BlurView intensity={20} tint="light" style={styles.buttonBlur}>
                <LinearGradient
                  colors={['rgba(30, 215, 96, 0.9)', 'rgba(30, 215, 96, 0.7)']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="musical-notes" size={24} color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Login com Spotify</Text>
                </LinearGradient>
              </BlurView>
            </TouchableOpacity>
          </View>

        </BlurView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 20, 65, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    width: width * 0.85,
    height: height * 0.5,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
    textAlign: 'center',
  },
  spotifyButton: {
    width: '80%',
    height: 60,
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 20,
  },
  buttonBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});