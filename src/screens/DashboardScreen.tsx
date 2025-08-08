import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { RootDrawerParamList } from '../types';
import { APP_NAME, COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';

type DashboardScreenNavigationProp = DrawerNavigationProp<
  RootDrawerParamList,
  'Dashboard'
>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

const DashboardScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const { isDarkMode } = useThemeContext();

  const containerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Text style={[styles.title, textStyle]}>
          {APP_NAME}
        </Text>
        <Text style={[styles.subtitle, textStyle]}>
          Welcome to your mobile dashboard
        </Text>
        <Text style={[styles.description, textStyle]}>
          Access customer management and measurement configuration from the menu.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: SPACING.MD,
    textAlign: 'center',
    opacity: 0.8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 24,
  },
});

export default DashboardScreen;