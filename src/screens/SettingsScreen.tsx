import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { RootDrawerParamList } from '../types';
import { COLORS, SPACING, APP_VERSION, APP_NAME } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { MaterialIcon } from '../components';

type SettingsScreenNavigationProp = DrawerNavigationProp<
  RootDrawerParamList,
  'Settings'
>;

interface Props {
  navigation: SettingsScreenNavigationProp & {
    navigate: (screen: string, params?: any) => void;
  };
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { themeMode, isDarkMode, setThemeMode } = useThemeContext();

  const containerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const cardStyle = {
    backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
    borderColor: isDarkMode ? '#404040' : '#e0e0e0',
  };

  const themes = [
    { id: 'light', name: 'Light Theme', description: 'Clean and bright interface' },
    { id: 'dark', name: 'Dark Theme', description: 'Easy on the eyes' },
    { id: 'system', name: 'System Default', description: 'Follow device settings' },
  ];

  const handleThemeChange = (themeId: string) => {
    setThemeMode(themeId as 'light' | 'dark' | 'system');
  };

  const handleNavigateToMeasurementConfig = () => {
    navigation.navigate('MeasurementConfig');
  };

  const handleNavigateToBillingConfig = () => {
    navigation.navigate('BillingConfig');
  };

  return (
    <ScrollView style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Text style={[styles.title, textStyle]}>Settings</Text>
        
        {/* Configuration Section */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Configuration</Text>
          <Text style={[styles.sectionDescription, textStyle]}>
            Manage your app configurations and templates
          </Text>
          
          <TouchableOpacity
            style={styles.configOption}
            onPress={handleNavigateToMeasurementConfig}
          >
            <View style={styles.configIcon}>
              <MaterialIcon name="straighten" size={24} color={COLORS.PRIMARY} />
            </View>
            <View style={styles.configInfo}>
              <Text style={[styles.configName, textStyle]}>Measurement Config</Text>
              <Text style={[styles.configDescription, textStyle]}>
                Manage measurement templates for different garment types
              </Text>
            </View>
            <MaterialIcon name="chevron-right" size={20} color={isDarkMode ? COLORS.LIGHT : COLORS.DARK} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.configOption}
            onPress={handleNavigateToBillingConfig}
          >
            <View style={styles.configIcon}>
              <MaterialIcon name="settings-applications" size={24} color={COLORS.PRIMARY} />
            </View>
            <View style={styles.configInfo}>
              <Text style={[styles.configName, textStyle]}>Billing Config</Text>
              <Text style={[styles.configDescription, textStyle]}>
                Configure billing items and received item templates
              </Text>
            </View>
            <MaterialIcon name="chevron-right" size={20} color={isDarkMode ? COLORS.LIGHT : COLORS.DARK} />
          </TouchableOpacity>
        </View>

        {/* Theme Section */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Theme</Text>
          <Text style={[styles.sectionDescription, textStyle]}>
            Choose your preferred app appearance
          </Text>
          
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeOption,
                themeMode === theme.id && styles.themeOptionActive,
              ]}
              onPress={() => handleThemeChange(theme.id)}
            >
              <View style={styles.themeInfo}>
                <Text style={[styles.themeName, textStyle]}>{theme.name}</Text>
                <Text style={[styles.themeDescription, textStyle]}>
                  {theme.description}
                </Text>
              </View>
              <View style={[
                styles.radioButton,
                themeMode === theme.id
                  ? styles.radioButtonSelected
                  : styles.radioButtonUnselected,
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info Section */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>About</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, textStyle]}>Version</Text>
            <Text style={[styles.infoValue, textStyle]}>{APP_VERSION}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, textStyle]}>App Name</Text>
            <Text style={[styles.infoValue, textStyle]}>{APP_NAME}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.LG,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    padding: SPACING.LG,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: SPACING.MD,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.SM,
  },
  themeOptionActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  radioButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
  },
  radioButtonUnselected: {
    borderColor: '#ccc',
    backgroundColor: 'transparent',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    opacity: 0.7,
  },
  configOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.SM,
  },
  configIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  configInfo: {
    flex: 1,
  },
  configName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  configDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
});

export default SettingsScreen;