import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MeasurementConfigStackParamList, MeasurementConfig } from '../types';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { useOfflineData, useOfflineMutation } from '../hooks/useOfflineSync';
import {
  SearchBar,
  MeasurementConfigListItem,
  LoadingSpinner,
  SyncStatusBar,
  CachedDataIndicator,
  OfflineMessage,
  SkeletonLoader,
  SkeletonCard,
  SkeletonList
} from '../components';

type MeasurementConfigScreenNavigationProp = StackNavigationProp<
  MeasurementConfigStackParamList,
  'MeasurementConfigList'
>;

interface Props {
  navigation: MeasurementConfigScreenNavigationProp;
}

const MeasurementConfigScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useThemeContext();
  
  // Offline-aware data loading
  const {
    data: configs,
    loading,
    error,
    isFromCache,
    lastUpdated,
    refresh,
    refetch,
  } = useOfflineData(
    'measurement_configs',
    () => apiService.getMeasurementConfigs(),
    []
  );

  // Offline-aware delete mutation
  const deleteConfigMutation = useOfflineMutation(
    (configId: string) => apiService.deleteMeasurementConfig(configId),
    {
      entity: 'measurementConfig',
      type: 'DELETE',
      onSuccess: () => {
        Alert.alert('Success', 'Template deleted successfully');
        refetch(); // Refresh the list
      },
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
      optimisticUpdate: (configId) => {
        // Optimistically remove from local state
        setFilteredConfigs(prev => prev.filter(c => c.id !== configId));
      },
      rollbackUpdate: () => {
        // Rollback by refetching data
        refetch();
      },
    }
  );

  const [filteredConfigs, setFilteredConfigs] = useState<MeasurementConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter configs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConfigs(configs || []);
    } else {
      const filtered = (configs || []).filter(config =>
        config.garmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.measurements.some(measurement =>
          measurement.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredConfigs(filtered);
    }
  }, [configs, searchQuery]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle add new template
  const handleAddTemplate = () => {
    navigation.navigate('MeasurementConfigForm', { mode: 'add' });
  };



  // Handle delete template
  const handleDeleteTemplate = async (config: MeasurementConfig) => {
    try {
      await deleteConfigMutation.mutate(config.id);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  // Handle template press (view details) - disabled for now
  const handleTemplatePress = (config: MeasurementConfig) => {
    // Template press functionality disabled - no editing allowed
    // Could be used for view-only details in the future
  };

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;
    
    const containerStyle = {
      backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
    };

    const textStyle = {
      color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
    };

    if (error && !configs?.length) {
      return (
        <OfflineMessage
          feature="Measurement Templates"
          message="Unable to load measurement templates. Please check your connection and try again."
          style={styles.emptyContainer}
        />
      );
    }

    if (searchQuery.trim() && filteredConfigs.length === 0) {
      return (
        <View style={[styles.emptyContainer, containerStyle]}>
          <Text style={[styles.emptyTitle, textStyle]}>No templates found</Text>
          <Text style={[styles.emptySubtitle, textStyle]}>
            No measurement templates match your search "{searchQuery}"
          </Text>
        </View>
      );
    }

    if ((configs?.length || 0) === 0) {
      return (
        <View style={[styles.emptyContainer, containerStyle]}>
          <Text style={[styles.emptyTitle, textStyle]}>No templates yet</Text>
          <Text style={[styles.emptySubtitle, textStyle]}>
            Create your first measurement template to get started
          </Text>
        </View>
      );
    }

    return null;
  };

  // Render list item
  const renderItem = ({ item }: { item: MeasurementConfig }) => (
    <MeasurementConfigListItem
      item={item}
      onPress={handleTemplatePress}
      onDelete={handleDeleteTemplate}
      testID={`measurement-config-item-${item.id}`}
    />
  );

  const containerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  // Loading state with skeleton animation
  if (loading) {
    return (
      <View style={[styles.container, containerStyle]}>
        <SyncStatusBar />
        
        {/* Search bar skeleton */}
        <View style={styles.searchBar}>
          <SkeletonLoader width="100%" height={48} borderRadius={8} />
        </View>

        {/* Measurement config list skeleton */}
        <SkeletonList 
          itemCount={5} 
          showAvatar={false}
          style={styles.skeletonContainer}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <SyncStatusBar />
      
      <SearchBar
        placeholder="Search templates..."
        onSearch={handleSearch}
        style={styles.searchBar}
        testID="measurement-config-search"
      />

      {isFromCache && lastUpdated && (
        <CachedDataIndicator lastUpdated={lastUpdated} />
      )}

      <FlatList
        data={filteredConfigs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        testID="measurement-config-list"
      />

      {/* Single floating action button for adding measurement templates */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddTemplate}
        accessibilityLabel="Add new measurement template"
        accessibilityHint="Create a new measurement template"
        testID="add-measurement-config-fab"
      >
        <Icon name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80, // Space for FAB
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.MD,
    textAlign: 'center',
    color: COLORS.ERROR,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
    marginBottom: SPACING.LG,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: SPACING.MD,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default MeasurementConfigScreen;