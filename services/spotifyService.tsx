// spotifyService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchTopAlbums = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (!accessToken) throw new Error("Token não encontrado");

    const playlistId = '37i9dQZEVXbLRQDuF5jeBp'; // Top 50 Global
    const url = `https://api.spotify.com/v1/playlists/${playlistId}`;

    const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log(response)

    const tracks = response.data.tracks.items;
    const albums = tracks.map((item: any) => item.track.album);
    return albums;
  }
  catch (error) {
    console.log(error)
  }
};
