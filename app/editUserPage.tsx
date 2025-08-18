import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, Alert, ActivityIndicator, 
  Image, TouchableOpacity, ScrollView, Animated, Dimensions, 
  TextInput 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import WheelColorPicker from "react-native-wheel-color-picker";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get('window');

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

  // novos estados
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  console.log(user)

  // Animações
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.9);

  useEffect(() => {
    loadUserData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadUserData = async () => {
    try {
      const userid = await AsyncStorage.getItem('userid');
      console.log(userid)
      const themeColor = await AsyncStorage.getItem("themeColor");
      if (themeColor) setSelectedColor(themeColor);

      if (userid) {
        const response = await axios.get(`https://musicboxdback.onrender.com/users/${userid}`);
        setUser(response.data);
        setName(response.data.name || "");
        setBio(response.data.bio || "");
        if (!themeColor && response.data.colors) setSelectedColor(response.data.colors);
      }
    } catch (error) {
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
    if (!result.canceled) setImage(result.assets[0].uri);
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
        body: formData,
      });
      const data = await response.json();
      await AsyncStorage.setItem('userpfp', data.url);
      return data.url;
    } catch {
      Alert.alert("Erro no upload da imagem");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!user) return;
    const userid = await AsyncStorage.getItem('userid');
    setSaving(true);
    try {
      await AsyncStorage.setItem("themeColor", selectedColor);
      const updateData: Partial<UserType> = {
        colors: selectedColor,
        name,
        bio,
      };
      if (image) {
        const imageUrl = await uploadImage();
        if (imageUrl) updateData.pfp = imageUrl;
      }
      await axios.patch(`https://musicboxdback.onrender.com/users/${userid}`, updateData);
      Alert.alert("Sucesso!", "Seu perfil foi atualizado!", [
        { text: "Ok", onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert("Ops!", "Não foi possível salvar suas alterações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <LinearGradient colors={['#1DB954', '#1ed760']} style={[styles.container, styles.centerContent]}>
      <ActivityIndicator size="large" color="white" />
      <Text style={styles.loadingText}>Carregando seu perfil...</Text>
    </LinearGradient>
  );

  if (!user) return (
    <LinearGradient colors={['#ff6b6b', '#ee5a52']} style={[styles.container, styles.centerContent]}>
      <Ionicons name="warning-outline" size={60} color="white" />
      <Text style={styles.errorText}>Oops! Não conseguimos carregar seus dados</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const darker = shadeColor(selectedColor, -0.3);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[selectedColor, darker]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={styles.placeholder} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Foto */}
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={pickImage} disabled={uploading}>
              {image || user.pfp ? (
                <Image source={{ uri: image || user.pfp }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="person" size={60} color="rgba(255,255,255,0.7)" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.imageHint}>
              {image ? "Nova foto selecionada!" : "Toque para alterar foto"}
            </Text>
          </View>

          {/* Nome */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu nome"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Bio */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Fale um pouco sobre você"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Cor */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎨 Sua Cor</Text>
          </View>
          <TouchableOpacity style={styles.colorPreview} onPress={() => setShowColorPicker(!showColorPicker)}>
            <View style={[styles.colorCircle, { backgroundColor: selectedColor }]} />
            <Text style={styles.colorText}>{selectedColor.toUpperCase()}</Text>
            <Ionicons name={showColorPicker ? "chevron-up" : "chevron-down"} size={20} color="white" />
          </TouchableOpacity>
          {showColorPicker && (
            <WheelColorPicker onColorChange={setSelectedColor} color={selectedColor} />
          )}
        </ScrollView>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveAll}
          disabled={saving || uploading}
        >
          <LinearGradient
            colors={saving ? ['#666', '#555'] : ['#1DB954', '#1ed760']}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.saveButtonText}>Salvando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="white" />
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 10 },
  centerContent: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.2)' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  placeholder: { width: 44 },
  scrollContent: { paddingBottom: 100 },
  imageContainer: { alignItems: 'center', marginVertical: 20 },
  profileImage: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  placeholderImage: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  imageHint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 10 },
  inputContainer: { marginVertical: 12 },
  label: { fontSize: 16, color: 'white', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 12, color: 'white', fontSize: 16 },
  textArea: { height: 90, textAlignVertical: 'top' },
  sectionHeader: { marginTop: 25, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  colorPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 12 },
  colorCircle: { width: 35, height: 35, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: 'white' },
  colorText: { flex: 1, fontSize: 16, color: 'white', fontWeight: '600' },
  saveButton: { position: "absolute", bottom: 20, left: 20, right: 20, borderRadius: 25, overflow: "hidden" },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  saveButtonText: { fontSize: 17, fontWeight: "bold", color: "white" },
  loadingText: { color: "white", marginTop: 15, fontSize: 18 },
  errorText: { color: "white", fontSize: 18, textAlign: "center", marginVertical: 20 },
  retryButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  retryButtonText: { color: "white", fontSize: 16, fontWeight: "bold" }
});
