import axios from 'axios';

const API_BASE_URL = "https://212.85.23.87"; // Substitua pela sua URL da API

class ReviewService {
  // Função para pegar reviews das pessoas que o usuário segue
  static async getReviewsFromFollowing(followingIds: string[]) {
    try {
      const response = await axios.post(`${API_BASE_URL}/review/from-following`, {
        followingIds
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar reviews dos seguindo:', error);
      return [];
    }
  }

  // Alternativa usando o novo endpoint direto (mais simples)
  static async getFollowingReviews(userId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/following/${userId}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar reviews dos seguindo:', error);
      return [];
    }
  }

  // Outras funções do ReviewService...
  static async createReview(reviewData: {
    userId: string;
    albumId: string;
    nota: number;
    text: string;
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/review`, reviewData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar review:', error);
      throw error;
    }
  }

  static async getReviewsByUserId(userId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/review/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar reviews do usuário:', error);
      return [];
    }
  }

  static async getReviewsByAlbumId(albumId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/review/album/${albumId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar reviews do álbum:', error);
      return [];
    }
  }

  static async deleteReview(reviewId: string) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/review/${reviewId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar review:', error);
      throw error;
    }
  }
}

export default ReviewService;