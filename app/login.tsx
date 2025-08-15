import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
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

interface LoginStep {
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: string;
}

interface UserData {
  id: string;
  display_name: string;
  email: string;
  spotifyID: string;
}

const { width, height } = Dimensions.get('window');

// Spotify OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const [loginSteps, setLoginSteps] = useState<LoginStep[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Função para adicionar step de login
  const addLoginStep = (message: string, type: 'info' | 'success' | 'error' = 'info'): void => {
    const timestamp = new Date().toLocaleTimeString();
    setLoginSteps(prev => [...prev, { message, type, timestamp }]);
    console.log(message);
  };

  // Configure AuthRequest
  const redirectUri: string = "musicbox://login";
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: 'f1279cc7c8c246f49bad620c58811730',
      scopes: ['user-read-email', 'user-library-read'],
      redirectUri,
      responseType: 'code' as AuthSession.ResponseType,
    },
    discovery
  );

  // Handle Spotify OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const code: string = response.params.code;
      addLoginStep('✅ Login com Spotify bem-sucedido!', 'success');
      addLoginStep(`📝 Código de autorização recebido: ${code.substring(0, 20)}...`, 'info');
    } else if (response?.type === 'error') {
      addLoginStep(`❌ Falha no login com Spotify: ${response.error || 'Erro desconhecido'}`, 'error');
    }
  }, [response, navigation]);

  useEffect(() => {
    if (response?.type === 'success') {
      setIsLoading(true);
      const code: string = response.params.code;
      const codeVerifier: string | undefined = request?.codeVerifier;
      
      addLoginStep('🔄 Iniciando troca de código por tokens...', 'info');
      
      fetch(`https://musicboxdback.onrender.com/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, codeVerifier }),
      })
      .then(async (res: Response) => {
        if (!res.ok) {
          addLoginStep(`❌ Erro na resposta do servidor: ${res.status}`, 'error');
          throw new Error('Falha na troca de código');
        }
        const data: { access_token: string; refresh_token: string } = await res.json();
        addLoginStep('🎯 Tokens recebidos com sucesso!', 'success');
        addLoginStep(`🔑 Access Token: ${data.access_token.substring(0, 30)}...`, 'info');
        addLoginStep(`🔄 Refresh Token: ${data.refresh_token.substring(0, 30)}...`, 'info');
        
        const { access_token, refresh_token } = data;
        
        addLoginStep('💾 Armazenando tokens no AsyncStorage...', 'info');
        await AsyncStorage.setItem("accessToken", access_token);
        await AsyncStorage.setItem("refreshToken", refresh_token);
        addLoginStep('✅ Tokens armazenados com sucesso!', 'success');

        addLoginStep('👤 Buscando dados do usuário no Spotify...', 'info');
        const meResponse: Response = await fetch(
          `https://api.spotify.com/v1/me`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        if (!meResponse.ok) {
          addLoginStep(`❌ Erro ao buscar dados do usuário: ${meResponse.status}`, 'error');
          throw new Error('Falha ao buscar dados do usuário');
        }

        const meData: { id: string; display_name: string; email: string } = await meResponse.json();
        addLoginStep(`✅ Dados do usuário recebidos: ${meData.display_name}`, 'success');
        addLoginStep(`📧 Email: ${meData.email}`, 'info');
        addLoginStep(`🆔 Spotify ID: ${meData.id}`, 'info');
        
        try {
          addLoginStep('🔄 Processando usuário no backend...', 'info');
          const encodedName: string = encodeURIComponent(meData.display_name);
          const userRes = await axios.post<UserData>(`https://musicboxdback.onrender.com/users/logProcess/${meData.id}?name=${encodedName}`);
          
          if (!userRes.data) {
            const errorText: string = userRes.statusText;
            addLoginStep(`❌ Erro ao processar usuário: ${userRes.status} - ${errorText}`, 'error');
            throw new Error(`Erro ao buscar/criar usuário: ${userRes.status} - ${errorText}`);
          }

          const user: UserData = userRes.data;
          addLoginStep('✅ Usuário processado com sucesso!', 'success');
          addLoginStep(`👤 ID do usuário: ${user.id}`, 'info');
          
          addLoginStep('💾 Armazenando dados do usuário...', 'info');
          await AsyncStorage.setItem('userid', user.id);
          await AsyncStorage.setItem('username', user.display_name || '');
          await AsyncStorage.setItem('spotifyID', user.spotifyID);
          addLoginStep('✅ Dados do usuário armazenados!', 'success');
          
          addLoginStep('🚀 Redirecionando para home...', 'success');
          setTimeout(() => {
            router.replace('home');
          }, 1000);
          
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          addLoginStep(`❌ Erro ao processar usuário: ${errorMessage}`, 'error');
          console.error('Erro ao buscar/criar usuário:', err);
        }
      })
      .catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        addLoginStep(`❌ Erro geral: ${errorMessage}`, 'error');
        console.error('Erro no processo de login:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [response]);

  const handleSpotifyLogin = (): void => {
    setLoginSteps([]);
    addLoginStep('🎵 Iniciando login com Spotify...', 'info');
    promptAsync();
  };

  const getStepColor = (type: 'info' | 'success' | 'error'): string => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'info':
      default:
        return '#2196F3';
    }
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
          <Text style={styles.title}>MusicBoxd</Text>
          
          {/* Spotify Login Button */}
          <TouchableOpacity 
            style={[styles.spotifyButton, isLoading && styles.disabledButton]}
            onPress={handleSpotifyLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <BlurView intensity={20} tint="light" style={styles.buttonBlur}>
              <LinearGradient
                colors={isLoading ? 
                  ['rgba(128, 128, 128, 0.9)', 'rgba(128, 128, 128, 0.7)'] :
                  ['rgba(30, 215, 96, 0.9)', 'rgba(30, 215, 96, 0.7)']}
                style={styles.buttonGradient}
              >
                <Ionicons 
                  name={isLoading ? "hourglass" : "musical-notes"} 
                  size={24} 
                  color="white" 
                  style={styles.buttonIcon} 
                />
                <Text style={styles.buttonText}>
                  {isLoading ? 'Processando...' : 'Login com Spotify'}
                </Text>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          {/* Login Steps Display */}
          {loginSteps.length > 0 && (
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>Status do Login:</Text>
              <ScrollView style={styles.stepsScrollView} showsVerticalScrollIndicator={false}>
                {loginSteps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={[styles.stepIndicator, { backgroundColor: getStepColor(step.type) }]} />
                    <View style={styles.stepContent}>
                      <Text style={styles.stepText}>{step.message}</Text>
                      <Text style={styles.stepTime}>{step.timestamp}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
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
    backgroundColor: 'rgba(0, 61, 31, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    width: width * 0.9,
    height: height * 0.8,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'flex-start',
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
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  spotifyButton: {
    width: '80%',
    height: 60,
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepsContainer: {
    width: '100%',
    flex: 1,
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 15,
  },
  stepsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepsScrollView: {
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    marginRight: 10,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
  },
  stepTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
});