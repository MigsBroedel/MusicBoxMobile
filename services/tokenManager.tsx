// tokenManager.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { Axios, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

// Nova interface para o interceptor do Axios
interface AxiosQueueItem {
  resolve: (value: AxiosResponse | PromiseLike<AxiosResponse>) => void;
  reject: (error: any) => void;
}

interface RequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  [key: string]: any;
}

class TokenManager {
  private isRefreshing: boolean = false;
  private failedQueue: AxiosQueueItem[] = []; // Mudança aqui

  // Função para renovar o access token
  async refreshAccessToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await fetch('https://musicboxdback.onrender.com/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Falha ao renovar token');
      }

      const data = await response.json();
      const { access_token, refresh_token } = data;

      // Salva os novos tokens
      await AsyncStorage.setItem('accessToken', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refreshToken', refresh_token);
      }

      return access_token;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      // Se falhar, redireciona para login
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
        },
      });

      // Se não for erro de autorização, retorna a resposta
      if (response.status !== 401) {
        return response;
      }

      // Token expirado, tenta renovar
      console.log('Token expirado, renovando...');
      accessToken = await this.refreshAccessToken();

      // Retry da requisição com o novo token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return retryResponse;
    } catch (error) {
      console.error('Erro na requisição autenticada:', error);
      throw error;
    }
  }

  // Limpar tokens (para logout)
  async clearTokens() {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userid', 'username', 'spotifyID']);
  }

  // Interceptor para Axios (se você usar axios)
  setupAxiosInterceptor(): void {
    // Interceptor de request
    axios.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem("accessToken");

        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`);
        }

        return config;
      }
    );

    // Interceptor de response
    axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Se já está renovando, adiciona à fila
            return new Promise<AxiosResponse>((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
              }
              return axios(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAccessToken();
            
            // Processa a fila de requisições que falharam
            this.failedQueue.forEach((item: AxiosQueueItem) => {
              // Refaz a requisição original com o novo token
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              }
              item.resolve(axios(originalRequest));
            });
            this.failedQueue = [];

            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            return axios(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach((item: AxiosQueueItem) => {
              item.reject(refreshError);
            });
            this.failedQueue = [];
            
            // Redireciona para login
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
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

// spotifyService.tsx - Exemplo de como usar o TokenManager
export class SpotifyService {
  private tokenManager: TokenManager;

  constructor() {
    this.tokenManager = tokenManagerInstance;
  }

  async getCurrentUser() {
    try {
      const response = await this.tokenManager.makeAuthenticatedRequest(
        'https://api.spotify.com/v1/me'
      );
      
      if (!response.ok) {
        throw new Error('Falha ao buscar dados do usuário');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      throw error;
    }
  }

  async getUserPlaylists() {
    try {
      const response = await this.tokenManager.makeAuthenticatedRequest(
        'https://api.spotify.com/v1/me/playlists'
      );
      
      if (!response.ok) {
        throw new Error('Falha ao buscar playlists');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar playlists:', error);
      throw error;
    }
  }

  async getUserLibrary(limit = 20, offset = 0) {
    try {
      const response = await this.tokenManager.makeAuthenticatedRequest(
        `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error('Falha ao buscar biblioteca');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar biblioteca:', error);
      throw error;
    }
  }
}

// Hook personalizado para React (opcional)
import { useState, useEffect } from 'react';

export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (accessToken && refreshToken) {
        // Testa se o token ainda é válido
        try {
          const response = await tokenManagerInstance.makeAuthenticatedRequest(
            'https://api.spotify.com/v1/me'
          );
          setIsAuthenticated(response.ok);
        } catch (error) {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
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