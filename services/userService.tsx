import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://musicboxdback.onrender.com'; // Substitua pela sua URL da API
const USER_LIST_KEY = "@userListenList"

export default class UserService {
  // Função para pegar os IDs das pessoas que o usuário segue
  static async getFollowingIds(userId: string): Promise<string[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/following/${userId}`);
      
      // A API retorna array de objetos User, então extraímos os IDs
      return response.data.map((user: any) => user.id);
    } catch (error) {
      console.error('Erro ao buscar seguindo:', error);
      return [];
    }
  }

  // Outras funções do UserService que você já pode ter...
  static async getUser(userId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  }

  static async searchUsers(name: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/search?name=${name}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }

  static async followUser(followerId: string, followingId: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/follow`, {
        followerId,
        followingId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao seguir usuário:', error);
      throw error;
    }
  }

  static async unfollowUser(followerId: string, followingId: string) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/unfollow`, {
        data: {
          followerId,
          followingId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao deixar de seguir usuário:', error);
      throw error;
    }
  }

  static async addToLocalListenList(ids: string[]) {
    try {
      const stored = await AsyncStorage.getItem(USER_LIST_KEY);
      let currentIds = stored ? JSON.parse(stored) : [];

      const newIds = [...new Set([...currentIds, ids])];
      await AsyncStorage.setItem(USER_LIST_KEY, JSON.stringify(newIds));
    } catch (err) {
      console.error("Erro ao adicionar à listen list local:", err);
    }
  }

  static async getLocalListenList(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(USER_LIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error("Erro ao carregar listen list local:", err);
      return [];
    }
  }

  static   async removeFromLocalListenList(idToRemove: string) {
    try {
      const stored = await AsyncStorage.getItem(USER_LIST_KEY);
      if (!stored) return;

      const ids = JSON.parse(stored);
      const filtered = ids.filter((id: string) => id !== idToRemove);

      await AsyncStorage.setItem(USER_LIST_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error("Erro ao remover ID da listen list local:", err);
    }
  }

  static async isAlbumInListenList(id: string): Promise<boolean> {
    const list = await this.getLocalListenList();
    console.log("saved: ", list)
    return list.includes(id);
  }

}
