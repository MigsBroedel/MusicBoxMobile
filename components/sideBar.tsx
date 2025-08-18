import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  StyleSheet, 
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  isLast?: boolean;
  action: () => void;
}

const Sidebar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setIsVisible(false));
  };

  const menuItems = [
    { icon: 'home', title: 'Início', action: () => console.log('Início') },
    { icon: 'library', title: 'Minha Biblioteca', action: () => router.push('listenListPage') },
    { icon: 'settings', title: 'Configurações', action: () => {router.push('configPage')} },
    { icon: 'body', title: 'Procurar pessoas', action: () => {router.push('searchUsersPage')} },
  ];

  const MenuItem: React.FC<MenuItemProps> = ({ icon, title, isLast = false, action }) => (
    <TouchableOpacity 
      style={[styles.menuItem, isLast && styles.lastMenuItem]} 
      onPress={() => {
        action(); // Execute a ação ANTES de fechar
        closeSidebar();
      }}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={24} color="#fff" style={styles.menuIcon} />
      <Text style={styles.menuText}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <>
      {/* Botão para abrir sidebar */}
      <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
        <Ionicons name="menu" size={28} color="white" />
      </TouchableOpacity>

      {/* Modal da Sidebar */}
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={closeSidebar}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          {/* Overlay com blur */}
          <Animated.View 
            style={[
              styles.overlay,
              { opacity: opacityAnim }
            ]}
          >
            <BlurView intensity={20} style={styles.blurView}>
              <TouchableOpacity 
                style={styles.overlayTouch} 
                onPress={closeSidebar}
                activeOpacity={1}
              />
            </BlurView>
          </Animated.View>

          {/* Sidebar */}
          <Animated.View 
            style={[
              styles.sidebar,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <SafeAreaView style={styles.sidebarContent}>
              {/* Header da Sidebar */}
              <View style={styles.sidebarHeader}>
                <View style={styles.headerContent}>
                  <Ionicons name="musical-notes" size={32} color="#EAEA54" />
                  <Text style={styles.appTitle}>Syntha</Text>
                </View>
                <TouchableOpacity onPress={closeSidebar} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Menu Items */}
              <View style={styles.menuContainer}>
                {menuItems.map((item, index) => (
                  <MenuItem
                    key={index}
                    icon={item.icon as keyof typeof Ionicons.glyphMap}
                    title={item.title}
                    action={item.action}
                    isLast={index === menuItems.length - 1}
                  />
                ))}
              </View>

              {/* Footer */}
              <View style={styles.sidebarFooter}>
                <TouchableOpacity style={styles.footerItem}>
                  <Ionicons name="help-circle" size={20} color="#666" />
                  <Text style={styles.footerText}>Ajuda</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerItem}>
                  <Ionicons name="information-circle" size={20} color="#666" />
                  <Text style={styles.footerText}>Sobre</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurView: {
    flex: 1,
  },
  overlayTouch: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#1a1a1a',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50, // Para compensar o status bar
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
  sidebarFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 12,
  },
});

export default Sidebar;