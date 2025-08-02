import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const width = Dimensions.get('window').width

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchToggle?: (value: boolean) => void;
  hasArrow?: boolean;
  onPress?: () => void;
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsPage: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(false);

  const SettingItem: React.FC<SettingItemProps> = ({ 
    icon, 
    title, 
    subtitle, 
    hasSwitch = false, 
    switchValue = false, 
    onSwitchToggle, 
    hasArrow = false, 
    onPress 
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={hasSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={22} color="#007AFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {hasSwitch && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchToggle}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        )}
        {hasArrow && (
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        )}
      </View>
    </TouchableOpacity>
  );

  const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const showAlert = (title: string, message: string): void => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', justifyContent: 'space-around', gap: 15, alignItems: 'center'}}>
            <TouchableOpacity onPress={() => {router.back()}}>
            <Ionicons name='chevron-back' color={"white"} size={24}/>
            </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => {
                AsyncStorage.removeItem('accessToken')
                AsyncStorage.removeItem('refreshToken')
                router.replace('login')
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>
          
          <Text style={styles.versionText}>Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 30,
    backgroundColor: '#161616ff',
  },
  header: {
    backgroundColor: '#0f0f0f',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    color: 'white',
    flexDirection: 'row',
    borderBottomColor: '#5e5e5eff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffffff',
    marginLeft: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#0f0f0fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#3f3f3fff',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#424242ff',
    minHeight: 60,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: '#f7f7f7ff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6D6D70',
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 8,
  },
  versionText: {
    fontSize: 13,
    color: '#6D6D70',
    textAlign: 'center',
  },
});

export default SettingsPage;