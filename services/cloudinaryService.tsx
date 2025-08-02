// cloudinaryService.ts - Serviço para upload direto ao Cloudinary
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurações do Cloudinary (substitua pelos seus valores)
const CLOUDINARY_CLOUD_NAME = 'dvyqptldm'; // Seu cloud name
const CLOUDINARY_UPLOAD_PRESET = 'UserPFP'; // Seu upload preset

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

// FAZER CLOUDINARY NO BACKEND

export const uploadToCloudinary = async (
  imageUri: string, 
  folder: string = 'user-uploads'
): Promise<CloudinaryUploadResult> => {
  try {
    const formData = new FormData();
    
    // Adiciona a imagem no FormData
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `upload_${Date.now()}.jpg`,
    } as any);
    
    // Configurações do upload
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('resource_type', 'image');

    // Faz o upload via fetch
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const result = await response.json();

    if (response.ok && result.secure_url) {
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } else {
      console.error('Cloudinary upload error:', result);
      return {
        success: false,
        error: result.error?.message || 'Upload failed',
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Função para selecionar e fazer upload de imagem
export const selectAndUploadImage = async (
  type: 'profile' | 'background',
  onProgress?: (progress: string) => void
): Promise<CloudinaryUploadResult> => {
  try {
    // Solicitar permissões
    onProgress?.('Solicitando permissões...');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      return {
        success: false,
        error: 'Permissão de acesso à galeria negada',
      };
    }

    // Abrir seletor de imagem
    onProgress?.('Abrindo galeria...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.8,
      exif: false,
    });

    if (result.canceled || !result.assets[0]) {
      return {
        success: false,
        error: 'Seleção de imagem cancelada',
      };
    }

    // Fazer upload
    onProgress?.('Enviando imagem...');
    const folder = type === 'profile' ? 'profile-pictures' : 'backgrounds';
    const uploadResult = await uploadToCloudinary(result.assets[0].uri, folder);

    if (uploadResult.success) {
      onProgress?.('Upload concluído!');
    }

    return uploadResult;
  } catch (error) {
    console.error('Select and upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
};

// Hook personalizado para gerenciar uploads
import { useState } from 'react';

export const useImageUpload = () => {
  const [uploading, setUploading] = useState<'profile' | 'background' | null>(null);
  const [progress, setProgress] = useState<string>('');

  const uploadImage = async (
    type: 'profile' | 'background',
    onSuccess: (url: string) => void,
    onError?: (error: string) => void
  ) => {
    setUploading(type);
    setProgress('Iniciando...');

    try {
      const result = await selectAndUploadImage(type, setProgress);

      if (result.success && result.url) {
        onSuccess(result.url);
        setProgress('');
      } else {
        const errorMsg = result.error || 'Falha no upload';
        onError?.(errorMsg);
        setProgress('');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro inesperado';
      onError?.(errorMsg);
      setProgress('');
    } finally {
      setUploading(null);
    }
  };

  return {
    uploading,
    progress,
    uploadImage,
  };
};

// Componente de exemplo usando o hook
import React from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageUploadButtonProps {
  type: 'profile' | 'background';
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  type,
  onImageUploaded,
  disabled = false,
}) => {
  const { uploading, progress, uploadImage } = useImageUpload();

  const handleUpload = () => {
    uploadImage(
      type,
      (url) => {
        onImageUploaded(url);
        Alert.alert('Sucesso!', 'Imagem enviada com sucesso!');
      },
      (error) => {
        Alert.alert('Erro', `Falha no upload: ${error}`);
      }
    );
  };

  const isCurrentlyUploading = uploading === type;

  return (
    <TouchableOpacity
      onPress={handleUpload}
      disabled={disabled || isCurrentlyUploading}
      style={{
        backgroundColor: isCurrentlyUploading ? '#666' : '#1db954',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {isCurrentlyUploading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Ionicons name="camera" size={20} color="white" />
      )}
    </TouchableOpacity>
  );
};

// Função para salvar URL no seu backend
export const saveImageToDatabase = async (
  type: 'profile' | 'background',
  imageUrl: string
): Promise<boolean> => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('accessToken');

    if (!userId || !token) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch('https://your-api.com/user/update-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        imageType: type,
        imageUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Database save error:', error);
    return false;
  }
};

// Função para buscar imagens do usuário
export const fetchUserImages = async (): Promise<{
  profileImage?: string;
  backgroundImage?: string;
} | null> => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('accessToken');

    if (!userId || !token) {
      return null;
    }

    const response = await fetch(`https://your-api.com/user/${userId}/images`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      profileImage: data.profile_image,
      backgroundImage: data.background_image,
    };
  } catch (error) {
    console.error('Fetch images error:', error);
    return null;
  }
};

// Exemplo de uso completo
export const useUserImages = () => {
  const [profileImage, setProfileImage] = useState<string>('');
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const { uploading, uploadImage } = useImageUpload();

  // Carregar imagens do usuário ao inicializar
  const loadImages = async () => {
    const images = await fetchUserImages();
    if (images) {
      setProfileImage(images.profileImage || '');
      setBackgroundImage(images.backgroundImage || '');
    }
  };

  // Upload e salvar no banco
  const handleImageUpload = async (type: 'profile' | 'background') => {
    uploadImage(
      type,
      async (url) => {
        // Salvar no banco
        const saved = await saveImageToDatabase(type, url);
        
        if (saved) {
          // Atualizar estado local
          if (type === 'profile') {
            setProfileImage(url);
          } else {
            setBackgroundImage(url);
          }
          Alert.alert('Sucesso!', 'Imagem atualizada com sucesso!');
        } else {
          Alert.alert('Aviso', 'Imagem enviada, mas houve erro ao salvar no perfil.');
        }
      },
      (error) => {
        Alert.alert('Erro', `Falha no upload: ${error}`);
      }
    );
  };

  return {
    profileImage,
    backgroundImage,
    uploading,
    loadImages,
    handleImageUpload,
  };
};