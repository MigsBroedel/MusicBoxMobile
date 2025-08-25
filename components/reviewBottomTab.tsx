import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReviewTypePost from "../types/reviewTypePost";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onLikePress: () => void;
  onSuccess: () => void;
  albumId: string;
};

export default function BottomSheet({
  visible,
  onClose,
  onLikePress,
  onSuccess,
  albumId,
}: BottomSheetProps) {
  const [nota, setNota] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmitPress = async () => {
    setIsSubmitting(true);
    try {
      const userId: string = (await AsyncStorage.getItem("userid")) || "";
      const review: ReviewTypePost = {
        nota,
        albumId,
        userId,
        text,
      };

      const response = await axios.post(
        `http://212.85.23.87:3000/review`,
        review
      );

      if (response.status === 201) {
        onSuccess();
      } else {
        console.warn("Erro inesperado ao criar review:", response.status);
      }
    } catch (error) {
      console.error("Erro no envio da review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              <Text style={styles.title}>Avalie o álbum</Text>

              <View style={styles.stars}>
                {[...Array(5)].map((_, index) => (
                  <TouchableOpacity key={index} onPress={() => setNota((index + 1) * 2)}>
                    <Ionicons
                      name={index < Math.round(nota / 2) ? "star" : "star-outline"}
                      size={28}
                      color="#FFD700"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Escreva sua resenha..."
                value={text}
                onChangeText={setText}
                style={styles.input}
                multiline
                placeholderTextColor="#999"
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={onSubmitPress}
                  style={styles.postButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Concluir</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000080",
  },
  content: {
    backgroundColor: "#121212",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  stars: {
    flexDirection: "row",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#FFF",
    borderRadius: 8,
    padding: 10,
    height: 300,
    textAlignVertical: "top",
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
  },
  postButton: {
    backgroundColor: "#35c212ff",
    borderRadius: 15,
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 20,
  },
});
