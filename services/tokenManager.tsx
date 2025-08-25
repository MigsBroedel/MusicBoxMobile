// tokenManager.tsx - Versão Corrigida
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

interface RequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  [key: string]: any;
}

class TokenManager {
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.setupAxiosInterceptor();
  }

  // Função para renovar o access token
  async refreshAccessToken(): Promise<string> {
    // Se já estiver renovando, retorna a mesma promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<string> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      console.log('🔄 Renovando access token...');
      
      const response = await fetch('http://212.85.23.87:3000/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Falha ao renovar token: ${response.status}`);
      }

      const data = await response.json();
      const { access_token, refresh_token } = data;

      // Salva os novos tokens
      await AsyncStorage.setItem('accessToken', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refreshToken', refresh_token);
      }

      console.log('✅ Access token renovado com sucesso');
      return access_token;
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      // Se falhar, limpa os tokens
      await this.clearTokens();
      throw error;
    }
  }

  // Função para fazer requisições autenticadas com retry automático
  async makeAuthenticatedRequest(url: string, options: RequestOptions = {}): Promise<Response> {
    try {
      let accessToken = await AsyncStorage.getItem('accessToken');
      
      if (!accessToken) {
        throw new Error('Token de acesso não encontrado');
      }

      // Primeira tentativa com o token atual
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Se não for erro de autorização, retorna a resposta
      if (response.status !== 401) {
        return response;
      }

      // Token expirado, tenta renovar
      console.log('🔄 Token expirado detectado, renovando...');
      
      try {
        accessToken = await this.refreshAccessToken();
      } catch (refreshError) {
        console.error('❌ Falha ao renovar token:', refreshError);
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Retry da requisição com o novo token
      console.log('🔄 Refazendo requisição com novo token...');
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return retryResponse;
    } catch (error) {
      console.error('❌ Erro na requisição autenticada:', error);
      throw error;
    }
  }

  // Limpar tokens (para logout)
  async clearTokens(): Promise<void> {
    console.log('🧹 Limpando tokens...');
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userid', 'username', 'spotifyID']);
  }

  // Verifica se o usuário está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      return !!(accessToken && refreshToken);
    } catch (error) {
      return false;
    }
  }

  // Interceptor para Axios (versão corrigida)
  setupAxiosInterceptor(): void {
    // Interceptor de request
    axios.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem("accessToken");

        if (token && config.headers) {
          config.headers.set('Authorization', `Bearer ${token}`);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor de response
    axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            
            // Atualiza o header da requisição original
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            
            // Refaz a requisição original
            return axios(originalRequest);
          } catch (refreshError) {
            // Se falhar ao renovar, limpa tokens e rejeita
            await this.clearTokens();
            return Promise.reject(new Error('Sessão expirada. Faça login novamente.'));
          }
        }

        return Promise.reject(error);
      }
    );
  }
}

// Exporta uma instância singleton
const tokenManagerInstance = new TokenManager();
export default tokenManagerInstance;

// Hook personalizado para React
import { useState, useEffect } from 'react';

export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const hasTokens = await tokenManagerInstance.isAuthenticated();
      
      if (hasTokens) {
        // Testa se o token ainda é válido fazendo uma requisição simples
        try {
          const response = await tokenManagerInstance.makeAuthenticatedRequest(
            'https://api.spotify.com/v1/me'
          );
          setIsAuthenticated(response.ok);
        } catch (error) {
          console.log('❌ Token inválido:', error);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await tokenManagerInstance.clearTokens();
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isLoading, logout, checkAuthStatus };
}