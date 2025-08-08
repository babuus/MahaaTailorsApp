import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CustomerStackParamList, Customer, ListState } from '../types';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { 
  SearchBar, 
  LoadingSpinner, 
  FloatingActionButton, 
  CustomerListItem,
  SwipeableCustomerItem,
  OneHandedToolbar,
  ConfirmDialog,
  SyncStatusBar,
  CachedDataIndicator,
  OfflineMessage,
  SkeletonLoader,
  SkeletonCard,
  SkeletonList
} from '../components';
import { useOfflineData, useOfflineMutation } from '../hooks/useOfflineSync';
import { apiService } from '../services/api';

type CustomerManagementScreenNavigationProp = StackNavigationProp<
  CustomerStackParamList,
  'CustomerList'
>;

interface Props {
  navigation: CustomerManagementScreenNavigationProp;
}

const CustomerManagementScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useThemeContext();
  
  // Offline-aware data loading
  const {
    data: customers,
    loading,
    error,
    isFromCache,
    lastUpdated,
    refresh,
    refetch,
  } = useOfflineData(
    'customers',
    () => apiService.getCustomers({ searchField: 'universal' }).then(response => response.items),
    []
  );

  // Offline-aware delete mutation
  const deleteCustomerMutation = useOfflineMutation(
    (customerId: string) => apiService.deleteCustomer(customerId),
    {
      entity: 'customer',
      type: 'DELETE',
      onSuccess: () => {
        setDeleteDialog({ visible: false, customer: null });
        Alert.alert('Success', 'Customer deleted successfully');
        refetch(); // Refresh the list
      },
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
      optimisticUpdate: (customerId) => {
        // Optimistically remove from local state
        setFilteredCustomers(prev => prev.filter(c => c.id !== customerId));
      },
      rollbackUpdate: () => {
        // Rollback by refetching data
        refetch();
      },
    }
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  const [deleteDialog, setDeleteDialog] = useState<{
    visible: boolean;
    customer: Customer | null;
  }>({
    visible: false,
    customer: null,
  });

  // Theme styles
  const containerStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  }), [isDarkMode]);

  const textStyle = useMemo(() => ({
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  }), [isDarkMode]);



  // Filter customers based on search query
  const filterCustomers = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers || []);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = (customers || []).filter(customer => {
      const name = customer.personalDetails.name.toLowerCase();
      const phone = customer.personalDetails.phone.toLowerCase();
      const email = customer.personalDetails.email?.toLowerCase() || '';
      
      return name.includes(query) || 
             phone.includes(query) || 
             email.includes(query);
    });

    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  // Handle search input
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle customer item press (navigate to detail)
  const handleCustomerPress = useCallback((customer: Customer) => {
    navigation.navigate('CustomerDetail', { customer });
  }, [navigation]);

  // Handle edit customer
  const handleEditCustomer = useCallback((customer: Customer) => {
    navigation.navigate('CustomerForm', { customer, mode: 'edit' });
  }, [navigation]);

  // Handle delete customer
  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setDeleteDialog({
      visible: true,
      customer,
    });
  }, []);

  // Confirm delete customer
  const confirmDeleteCustomer = useCallback(async () => {
    if (!deleteDialog.customer) return;

    try {
      await deleteCustomerMutation.mutate(deleteDialog.customer.id);
    } catch (error) {
      // Error handling is done in the mutation
    }
  }, [deleteDialog.customer, deleteCustomerMutation]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteDialog({ visible: false, customer: null });
  }, []);

  // Handle add new customer
  const handleAddCustomer = useCallback(() => {
    navigation.navigate('CustomerForm', { mode: 'add' });
  }, [navigation]);

  // Handle pull to refresh
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Handle call customer
  const handleCallCustomer = useCallback(async (customer: Customer) => {
    const phoneNumber = customer.personalDetails.phone;
    const phoneUrl = `tel:${phoneNumber}`;
    
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone dialer is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open phone dialer');
    }
  }, []);

  // Handle search modal
  const handleSearchPress = useCallback(() => {
    setShowSearchModal(true);
  }, []);

  // Handle search modal close
  const handleSearchClose = useCallback(() => {
    setShowSearchModal(false);
  }, []);

  // Render customer list item
  const renderCustomerItem = useCallback(({ item }: { item: Customer }) => {
    return (
      <SwipeableCustomerItem
        customer={item}
        onPress={handleCustomerPress}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
        onCall={handleCallCustomer}
        testID={`customer-item-${item.id}`}
      />
    );
  }, [handleCustomerPress, handleEditCustomer, handleDeleteCustomer, handleCallCustomer]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (error && !customers?.length) {
      return (
        <OfflineMessage
          feature="Customer Management"
          message="Unable to load customers. Please check your connection and try again."
          style={styles.emptyState}
        />
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, textStyle]}>
          {searchQuery ? 'No customers found' : 'No customers yet'}
        </Text>
        <Text style={[styles.emptySubtitle, textStyle]}>
          {searchQuery 
            ? 'Try adjusting your search terms' 
            : 'Add your first customer to get started'
          }
        </Text>
      </View>
    );
  }, [searchQuery, textStyle, error, customers]);

  // Effects
  useEffect(() => {
    filterCustomers();
  }, [filterCustomers]);

  // Loading state with skeleton animation
  if (loading) {
    return (
      <View style={[styles.container, containerStyle]}>
        <SyncStatusBar />
        
        {/* Search bar skeleton */}
        <View style={styles.searchContainer}>
          <SkeletonLoader width="100%" height={48} borderRadius={8} />
        </View>

        {/* Customer list skeleton */}
        <SkeletonList 
          itemCount={6} 
          showAvatar={true}
          style={styles.skeletonContainer}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <SyncStatusBar />
      
      {/* Always show search bar, but style it differently for one-handed mode */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search customers by name, phone, or email"
          onSearch={handleSearch}
          testID="customer-search"
        />
      </View>

      {isFromCache && lastUpdated && (
        <CachedDataIndicator lastUpdated={lastUpdated} />
      )}

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="customer-list"
      />

      {/* Single floating action button for adding customers */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddCustomer}
        accessibilityLabel="Add new customer"
        accessibilityHint="Navigate to add customer form"
        testID="add-customer-fab"
      >
        <Icon name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Search Modal */}
      {showSearchModal && (
        <View style={styles.searchModal}>
          <View style={[styles.searchModalContent, { backgroundColor: isDarkMode ? '#333333' : '#FFFFFF' }]}>
            <View style={styles.searchModalHeader}>
              <Text style={[styles.searchModalTitle, textStyle]}>Search Customers</Text>
              <TouchableOpacity onPress={handleSearchClose}>
                <Icon name="close" size={24} color={isDarkMode ? COLORS.LIGHT : COLORS.DARK} />
              </TouchableOpacity>
            </View>
            <SearchBar
              placeholder="Search by name, phone, or email"
              onSearch={handleSearch}
              testID="customer-search-modal"
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  handleSearch('');
                }}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={deleteDialog.visible}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deleteDialog.customer?.personalDetails.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteCustomer}
        onCancel={cancelDelete}
        destructive={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.SM,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80, // Space for FAB
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
    textAlign: 'center',
    color: COLORS.ERROR,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: SPACING.LG,
  },
  retryButton: {
    position: 'relative',
    margin: 0,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20, // Move to right side
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
  fabText: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: SPACING.MD,
    alignItems: 'center',
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: SPACING.MD,
  },
  searchModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  searchModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.XL,
    maxHeight: '50%',
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearSearchButton: {
    alignSelf: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    marginTop: SPACING.SM,
  },
  clearSearchText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CustomerManagementScreen;