import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import axios from 'axios';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { colors } from 'react-native-elements';
import TestConnection from '../components/testComponent';

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

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

const { width, height } = Dimensions.get('window');

// Spotify OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const CLIENT_ID = 'f1279cc7c8c246f49bad620c58811730';
const REDIRECT_URI = 'musicbox://login';

// URLs do backend para testar (adicione sua URL local aqui)
const BACKEND_URLS = [
  'http://212.85.23.87:3000',  // HTTP na porta 3000 (fallback)
];

export default function LoginScreen() {
  const navigation = useNavigation();
  const [loginSteps, setLoginSteps] = useState<LoginStep[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backendUrl, setBackendUrl] = useState<string>(BACKEND_URLS[0]);

  // Função para adicionar step de login
  const addLoginStep = (message: string, type: 'info' | 'success' | 'error' = 'info'): void => {
    const timestamp = new Date().toLocaleTimeString();
    setLoginSteps(prev => [...prev, { message, type, timestamp }]);
    console.log(`[${timestamp}] ${message}`);
  };

  // Configure AuthRequest com PKCE
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: [
        'user-read-email',
        'user-read-private',
        'user-library-read',
        'user-top-read',
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-read-playback-state',
        'user-modify-playback-state'
      ],
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        code_challenge_method: 'S256'
      }
    },
    discovery
  );

  // Função para testar conectividade com o backend
  const testBackendConnection = async (): Promise<string | null> => {
    addLoginStep('🔍 Testando conectividade com o backend...', 'info');
    
    
      try {
        addLoginStep(`🌐 Testando: http://212.85.23.87:3000`, 'info');
        
        const response = await fetch(`http://212.85.23.87:3000/auth/health`, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          addLoginStep(`✅ Backend conectado: http://212.85.23.87:3000`, 'success');
          setBackendUrl('http://212.85.23.87:3000');
          return 'http://212.85.23.87:3000';
        } else {
          addLoginStep(`⚠️ Backend respondeu com status ${response.status}: http://212.85.23.87:3000`, 'error');
        }
      } catch (error: any) {
        addLoginStep(`❌ Falha ao conectar: http://212.85.23.87:3000 - ${error.message}`, 'error');
      }
    
    
    addLoginStep('❌ Nenhum backend disponível encontrado', 'error');
    return null;
  };

  // Handle Spotify OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      setIsLoading(true);
      handleSuccessfulAuth(response.params.code);
    } else if (response?.type === 'error') {
      addLoginStep(`❌ Erro no OAuth: ${response.error?.description || response.error || 'Erro desconhecido'}`, 'error');
      setIsLoading(false);
    } else if (response?.type === 'cancel') {
      addLoginStep('⚠️ Login cancelado pelo usuário', 'error');
      setIsLoading(false);
    }
  }, [response]);

  const handleSuccessfulAuth = async (authCode: string) => {
  try {
    addLoginStep('✅ Código de autorização recebido!', 'success');
    
    if (!request?.codeVerifier) {
      throw new Error('Code verifier não encontrado');
    }

    const availableBackend = await testBackendConnection();
    if (!availableBackend) {
      throw new Error('Nenhum backend disponível');
    }

    addLoginStep('🔄 Trocando código por tokens...', 'info');

    // Dados para PKCE
    const requestData = {
      code: authCode,
      codeVerifier: request.codeVerifier,
      redirect_uri: REDIRECT_URI
    };

    // Use fetch para melhor controle
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${availableBackend}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const tokens = await response.json();
      await processTokens(tokens);
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }

  } catch (error: any) {
    addLoginStep(`❌ Erro: ${error.message}`, 'error');
    setIsLoading(false);
  }
};

  // Função para tentar diferentes métodos de conexão
  const tryMultipleMethods = async (requestData: any, backendUrl: string) => {
    const methods = [
      { name: 'Axios com timeout baixo', fn: () => tryAxios(requestData, backendUrl, 8000) },
      { name: 'Fetch nativo', fn: () => tryNativeFetch(requestData, backendUrl) },
      { name: 'Axios com timeout alto', fn: () => tryAxios(requestData, backendUrl, 15000) },
    ];

    for (const method of methods) {
      try {
        addLoginStep(`🔄 Tentando: ${method.name}...`, 'info');
        await method.fn();
        return; // Se chegou aqui, deu certo
      } catch (error: any) {
        addLoginStep(`❌ ${method.name} falhou: ${error.message}`, 'error');
        
        if (method === methods[methods.length - 1]) {
          throw error; // Se foi o último método, propaga o erro
        }
      }
    }
  };

  // Método com Axios
  const tryAxios = async (requestData: any, backendUrl: string, timeout: number = 10000) => {
    const response = await axios.post(`${backendUrl}/auth/callback`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      timeout,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }

    addLoginStep('🎉 Tokens recebidos via Axios!', 'success');
    await processTokens(response.data);
  };

  // Método com fetch nativo
  const tryNativeFetch = async (requestData: any, backendUrl: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${backendUrl}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const tokens = await response.json();
      addLoginStep('🎉 Tokens recebidos via fetch nativo!', 'success');
      await processTokens(tokens);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Função para processar os tokens recebidos
  const processTokens = async (tokens: SpotifyTokenResponse) => {
    console.log("Access Token recebido:", tokens.access_token?.substring(0, 20) + '...');

    // Salvar tokens localmente
    await AsyncStorage.multiSet([
      ['accessToken', tokens.access_token],
      ['refreshToken', tokens.refresh_token],
      ['spotify_expires_in', tokens.expires_in.toString()],
      ['spotify_token_timestamp', Date.now().toString()]
    ]);

    addLoginStep('💾 Tokens salvos localmente', 'success');

    // Buscar dados do usuário
    await fetchUserData(tokens.access_token);

    // Navegar para a tela principal
    addLoginStep('🚀 Login completo! Redirecionando...', 'success');
    
    setTimeout(() => {
      router.replace('/home');
    }, 2000);
  };

  const userLogProccessSpotify = async (spotifyID: string, name?: string) => {
    try {
      addLoginStep('👤 Processando usuário no backend...', 'info');
      
      const res = await fetch(`${backendUrl}/users/logProcess/${spotifyID}?name=${encodeURIComponent(name || "")}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!res.ok) {
        throw new Error(`Erro no logProcess: ${res.status}`);
      }

      const user = await res.json();
      addLoginStep('✅ Usuário processado com sucesso', 'success');
      return user;
    } catch (err) {
      console.error("Erro no login:", err);
      addLoginStep(`⚠️ Erro ao processar usuário: ${err}`, 'error');
      throw err;
    }
  }

  const fetchUserData = async (accessToken: string) => {
    try {
      addLoginStep('👤 Buscando dados do usuário no Spotify...', 'info');
      
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      });

      const userData = userResponse.data;
      addLoginStep(`✅ Dados do Spotify obtidos para: ${userData.display_name}`, 'success');

      const responseProccess = await userLogProccessSpotify(userData.id, userData.display_name);

      await AsyncStorage.setItem("userid", responseProccess.id);
      
      // Salvar dados do usuário
      await AsyncStorage.setItem('user_data', JSON.stringify({
        id: userData.id,
        display_name: userData.display_name || 'Usuário Spotify',
        email: userData.email || `${userData.id}@spotify.local`,
        country: userData.country,
        followers: userData.followers?.total || 0,
        images: userData.images || []
      }));

      addLoginStep(`✅ Bem-vindo, ${userData.display_name || userData.id}!`, 'success');

    } catch (error: any) {
      console.error('Erro ao buscar dados do usuário:', error);
      addLoginStep('⚠️ Erro ao buscar dados do usuário, mas login foi bem-sucedido', 'error');
    }
  };

  const handleSpotifyLogin = async (): Promise<void> => {
    if (isLoading) return;

    setLoginSteps([]);
    setIsLoading(true);
    addLoginStep('🎵 Iniciando autenticação com Spotify...', 'info');
    
    try {
      await promptAsync();
    } catch (error: any) {
      console.error('Erro ao iniciar prompt:', error);
      addLoginStep(`❌ Erro ao iniciar login: ${error.message}`, 'error');
      setIsLoading(false);
    }
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
      <BlurView intensity={30} tint="dark" style={styles.glassContainer}>
        <LinearGradient
          colors={['rgba(10, 17, 0, 0.99)', 'rgba(34, 34, 34, 1)']}
          style={styles.gradientOverlay}
        />
        
        <View style={styles.contentContainer}>
          <Image source={require('../assets/icon.png')} style={{height: 150, width: 150, borderRadius: 15}}/>
          <Text style={styles.title}>Syntha</Text>

          <TestConnection />
          
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

          {/* Current Backend URL Display */}
          <Text style={{color: colors.grey2}}>Backend: {backendUrl}</Text>

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
    backgroundColor: '#007196',
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