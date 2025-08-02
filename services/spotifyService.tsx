import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const spotifyService = {

    async searchByName (query: string, type: "album" | "artist") {
        const token = await AsyncStorage.getItem('accessToken');

    const response = await axios.get("https://api.spotify.com/v1/search", {
        headers: {
        Authorization: `Bearer ${token}`,
        },
        params: {
        q: query,
        type: type,
        limit: 10,
        },
    });

    return response.data;
    }
}