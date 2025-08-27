import React from 'react';
import axios from 'axios';
import { View, Button, Alert } from 'react-native';

const TestConnection = () => {
  const testBackend = async () => {
    try {
      const response = await axios.get('http://212.85.23.87:3000/auth/health');
      Alert.alert('✅ Sucesso', `Status: ${response.status}`);
      console.log(response.data)
    } catch (error) {
      console.log(error)
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'red'}}>
      <Button title="Testar Conexão" onPress={testBackend} />
    </View>
  );
};

export default TestConnection;