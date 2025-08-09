import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { RootDrawerParamList } from '../types';
import { APP_NAME, COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { SimpleIcon } from '../components';

type DashboardScreenNavigationProp = DrawerNavigationProp<
  RootDrawerParamList,
  'Dashboard'
>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useThemeContext();
  const { width } = Dimensions.get('window');

  const containerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const cardStyle = {
    backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    shadowColor: isDarkMode ? '#000' : '#000',
  };

  const quickActions = [
    {
      id: 'customers',
      title: 'Customers',
      subtitle: 'Manage customer profiles',
      icon: 'people',
      color: COLORS.PRIMARY,
      onPress: () => navigation.navigate('CustomerManagement'),
    },
    {
      id: 'measurements',
      title: 'Measurements',
      subtitle: 'Configure measurement types',
      icon: 'straighten',
      color: COLORS.SECONDARY,
      onPress: () => navigation.navigate('MeasurementConfig'),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences & sync',
      icon: 'settings',
      color: '#7E57C2',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView style={[styles.container, containerStyle]} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={[styles.welcomeCard, cardStyle]}>
          <Text style={[styles.welcomeText, textStyle]}>Welcome back!</Text>
          <Text style={[styles.appTitle, textStyle]}>{APP_NAME}</Text>
          <Text style={[styles.tagline, textStyle]}>Your tailoring business companion</Text>
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textStyle]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, cardStyle]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
                <SimpleIcon name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={[styles.actionTitle, textStyle]}>{action.title}</Text>
              <Text style={[styles.actionSubtitle, textStyle]}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textStyle]}>Overview</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, cardStyle]}>
            <Text style={[styles.statNumber, { color: COLORS.PRIMARY }]}>0</Text>
            <Text style={[styles.statLabel, textStyle]}>Total Customers</Text>
          </View>
          <View style={[styles.statCard, cardStyle]}>
            <Text style={[styles.statNumber, { color: COLORS.SECONDARY }]}>0</Text>
            <Text style={[styles.statLabel, textStyle]}>Measurements</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity Placeholder */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textStyle]}>Recent Activity</Text>
        <View style={[styles.emptyState, cardStyle]}>
          <SimpleIcon name="history" size={48} color={isDarkMode ? '#555' : '#CCC'} />
          <Text style={[styles.emptyStateText, textStyle]}>No recent activity</Text>
          <Text style={[styles.emptyStateSubtext, textStyle]}>
            Your recent actions will appear here
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.LG,
    paddingBottom: SPACING.MD,
  },
  welcomeCard: {
    padding: SPACING.LG,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: SPACING.XS,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: SPACING.XS,
  },
  tagline: {
    fontSize: 16,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  section: {
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    padding: SPACING.LG,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.XS,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    padding: SPACING.LG,
    borderRadius: 12,
    marginHorizontal: SPACING.XS,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.XS,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  emptyState: {
    padding: SPACING.XL,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});

export default DashboardScreen;