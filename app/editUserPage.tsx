import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, Image, TouchableOpacity, ScrollView, Animated, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import WheelColorPicker from "react-native-wheel-color-picker";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { MediaType } from "expo-image-picker";

const { width, height } = Dimensions.get('window');

type UserType = {
  name: string;
  colors: string;
  pfp: string;
  bio: string;
  spotifyID: string;
  favoriteAlbums: string[] | null;
  favoriteArtists: string[] | null;
};

function shadeColor(hex: string, percent: number): string {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.min(255, Math.max(0, r + (r * percent)));
  g = Math.min(255, Math.max(0, g + (g * percent)));
  b = Math.min(255, Math.max(0, b + (b * percent)));
  const newHex = '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
  return newHex;
}

export default function EditUserPage() {
  const router = useRouter();
  const [selectedColor, setSelectedColor] = useState<string>("#1DB954");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Animações
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.9);

  useEffect(() => {
    loadUserData();
    
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadUserData = async () => {
    try {
      const userid = await AsyncStorage.getItem('userid');
      const themeColor = await AsyncStorage.getItem("themeColor");
      
      if (themeColor) {
        setSelectedColor(themeColor);
      }

      if (userid) {
        const response = await axios.get(`https://musicboxdback.onrender.com/users/${userid}`);
        setUser(response.data);
        
        if (!themeColor && response.data.colors) {
          setSelectedColor(response.data.colors);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
      Alert.alert("Erro ao carregar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para alterar sua foto de perfil");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      
      // Animação da nova imagem
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!image) return null;

    setUploading(true);
    const uriParts = image.split(".");
    const fileType = uriParts[uriParts.length - 1];

    const formData = new FormData();
    formData.append("file", {
      uri: image,
      name: `profile.${fileType}`,
      type: `image/${fileType}`,
    } as any);

    try {
      const response = await fetch("https://musicboxdback.onrender.com/cloudinary/upload", {
        method: "POST",
        headers: {
         
        },
        body: formData,
      });

      const data = await response.json();
      console.log(data)
      await AsyncStorage.setItem('userpfp', data.url);
      return data.url;
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      Alert.alert("Erro no upload", "Não foi possível fazer upload da imagem");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!user) {
      Alert.alert("Erro", "Dados do usuário não carregados");
      return;
    }

    const userid = await AsyncStorage.getItem('userid');
    setSaving(true);
    
    try {
      await AsyncStorage.setItem("themeColor", selectedColor);

      const updateData: Partial<UserType> = {};
      updateData.colors = selectedColor;

      if (image) {
        console.log('iniciando upload')
        const imageUrl = await uploadImage();
        if (imageUrl) {
          updateData.pfp = imageUrl;
          console.log('concluindo upload')

        }
      }

      const response = await axios.patch(`https://musicboxdback.onrender.com/users/${userid}`, updateData);
      
      // Animação de sucesso
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Alert.alert("Sucesso!", "Seu perfil foi atualizado com estilo!", [
        { text: "Confirmar", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.log("Erro ao salvar:", error);
      Alert.alert("Ops!", "Algo deu errado ao salvar suas alterações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1DB954', '#1ed760', '#1aa34a']} style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Carregando seu perfil...</Text>
      </LinearGradient>
    );
  }

  if (!user) {
    return (
      <LinearGradient colors={['#ff6b6b', '#ee5a52']} style={[styles.container, styles.centerContent]}>
        <Ionicons name="warning-outline" size={60} color="white" />
        <Text style={styles.errorText}>Oops! Não conseguimos carregar seus dados</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const darker = shadeColor(selectedColor, -0.3);
  const lighter = shadeColor(selectedColor, 0.2);

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={[selectedColor, darker, lighter]} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={styles.placeholder} />
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View 
            style={[
              styles.profileSection,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.imageContainer}>
              <TouchableOpacity 
                style={styles.imageWrapper}
                onPress={pickImage}
                disabled={uploading}
              >
                {image || user.pfp ? (
                  <Image 
                    source={{ uri: image || user.pfp }} 
                    style={styles.profileImage} 
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="person" size={60} color="rgba(255,255,255,0.7)" />
                  </View>
                )}
                
                <View style={styles.cameraOverlay}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={24} color="white" />
                  )}
                </View>
              </TouchableOpacity>
              
              <Text style={styles.imageHint}>
                {image ? "Nova foto selecionada!" : "Toque para alterar foto"}
              </Text>
            </View>
          </Animated.View>

          
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎨 Sua Cor Única</Text>
              <Text style={styles.sectionSubtitle}>
                Escolha a cor que representa seu estilo
              </Text>
            </View>

            <TouchableOpacity
              style={styles.colorPreview}
              onPress={() => setShowColorPicker(!showColorPicker)}
            >
              <View style={[styles.colorCircle, { backgroundColor: selectedColor }]} />
              <Text style={styles.colorText}>
                {selectedColor.toUpperCase()}
              </Text>
              <Ionicons 
                name={showColorPicker ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>

            {showColorPicker && (
              
                <WheelColorPicker
                  onColorChange={(color: string) => setSelectedColor(color)}
                  color={selectedColor}
               
                />
              
            )}
          
        </ScrollView>

        <Animated.View 
          style={[
            styles.bottomSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveAll}
            disabled={saving || uploading}
          >
            <LinearGradient
              colors={saving ? ['#666', '#555'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.saveButtonText}>Salvando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 10
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  imageContainer: {
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  imageHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 15,
    textAlign: 'center',
  },
  colorSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  colorText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  colorPickerContainer: {
    height: 300,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 15,
    padding: 20,
  },
  colorPicker: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingText: {
    color: 'white',
    marginTop: 15,
    fontSize: 18,
    fontWeight: '500',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});