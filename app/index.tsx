import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    };

    checkLogin().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
        <View>
        <ActivityIndicator size="large" />
        </View>
        
    );
  }

  return null; // Enquanto redireciona
}
