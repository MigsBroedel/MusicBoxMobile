import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Tipos TypeScript
interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  followers: {
    total: number;
  };
  country: string;
  product: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface UseSpotifyAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  userInfo: SpotifyUser | null;
  getValidToken: () => Promise<string | null>;
  makeAuthenticatedRequest: (url: string, options?: RequestInit) => Promise<Response>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  checkAuthStatus: () => Promise<void>;
}

// Hook personalizado para gerenciar autenticação Spotify
const useSpotifyAuth = (): UseSpotifyAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<SpotifyUser | null>(null);

  // Verifica se existe token válido ao inicializar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const token = await getValidToken();
      if (token) {
        setIsAuthenticated(true);
        await fetchUserInfo(token);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtém token válido (renova se necessário)
  const getValidToken = async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem('spotify_access_token');
      const tokenExpiry = await AsyncStorage.getItem('spotify_token_expiry');
      
      if (token && tokenExpiry) {
        const now = Date.now();
        if (now < parseInt(tokenExpiry)) {
          return token;
        } else {
          // Token expirado, tenta renovar
          const newToken = await refreshToken();
          return newToken;
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter token válido:', error);
      return null;
    }
  };

  // Renova o token
  const refreshToken = async (): Promise<string | null> => {
    try {
      const refreshToken = await AsyncStorage.getItem('spotify_refresh_token');
      const clientId = 'SEU_CLIENT_ID_AQUI'; // Substitua pelo seu client ID
      
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
        }).toString(),
      });

      const tokenData: TokenResponse = await response.json();

      if (response.ok) {
        const expiryTime = Date.now() + (tokenData.expires_in * 1000);
        
        await AsyncStorage.multiSet([
          ['spotify_access_token', tokenData.access_token],
          ['spotify_refresh_token', tokenData.refresh_token || refreshToken],
          ['spotify_token_expiry', expiryTime.toString()],
          ['spotify_token_type', tokenData.token_type || 'Bearer']
        ]);

        return tokenData.access_token;
      } else {
        throw new Error('Erro ao renovar token');
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      await logout();
      return null;
    }
  };

  // Busca informações do usuário
  const fetchUserInfo = async (accessToken: string): Promise<void> => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData: SpotifyUser = await response.json();
        setUserInfo(userData);
      }
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
    }
  };

  // Faz logout
  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        'spotify_access_token',
        'spotify_refresh_token',
        'spotify_token_expiry',
        'spotify_token_type',
        'spotify_code_verifier'
      ]);
      
      setIsAuthenticated(false);
      setUserInfo(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Função para fazer requisições autenticadas
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      const token = await getValidToken();
      if (!token) {
        throw new Error('Token não disponível');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token inválido, tenta renovar
        const newToken = await refreshToken();
        if (newToken) {
          // Refaz a requisição com o novo token
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          });
        } else {
          throw new Error('Não foi possível renovar o token');
        }
      }

      return response;
    } catch (error) {
      console.error('Erro na requisição autenticada:', error);
      throw error;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    userInfo,
    getValidToken,
    makeAuthenticatedRequest,
    logout,
    refreshToken,
    checkAuthStatus
  };
};

export default useSpotifyAuth;