import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import axios from "axios";
import { ReviewCardLong } from "../components/reviewCardLong";
import Review from "../types/reviewType";
import moment from "moment";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type GroupedReviews = {
  [key: string]: Review[];
};

export default function UserReviewsPage() {
  const { userid } = useLocalSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [groupedReviews, setGroupedReviews] = useState<GroupedReviews>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserReviews = async (userId: string) => {
    try {
      const resp = await axios.get(`https://musicboxdback.onrender.com/review/user/${userId}`);
      const arr: Review[] = resp.data;
      const sorted = Array.isArray(arr)
        ? arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];

      const grouped: GroupedReviews = {};

      sorted.forEach((review) => {
        const groupKey = moment(review.createdAt).format("MMMM YYYY").toUpperCase(); // e.g. "JUNE 2024"
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(review);
      });

      setReviews(sorted);
      setGroupedReviews(grouped);
    } catch (err) {
      console.error("Erro ao buscar reviews:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof userid === "string") {
      setUserId(userid);
    }
  }, [userid]);

  useEffect(() => {
    if (userId) {
      fetchUserReviews(userId);
    }
  }, [userId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: "#333" }}>
        <View style={{backgroundColor: "black", padding: 10, flexDirection: 'row', gap: 20, marginBottom: 10}}>
            <TouchableOpacity onPress={() => {router.back()}}>
                <Ionicons name="chevron-back" color={"white"} size={24} />
            </TouchableOpacity>
            <Text style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "white",
                justifyContent: 'center'
            }}>
                Histórico
            </Text>
        </View>
      {Object.entries(groupedReviews).map(([group, reviews]) => (
        <View key={group} style={{ marginBottom: 20, gap: 10 }}>
          <Text style={{
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 10,
            padding: 10,
            color: "#ccc",
            backgroundColor: "#222",
            flex: 1
          }}>
            {group}
          </Text>

          <View style={{ padding: 10}}>
            {reviews.map((r) => (
            <ReviewCardLong
              nota={r.nota}
              albumid={r.albumid}
              id={r.id}
              likes={r.likes}
              text={r.text}
              key={r.id}
              user={r.user}
              createdAt={r.createdAt}
            />
          ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
