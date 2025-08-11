import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import {
  LoadingSpinner,
  ModernButton,
  ModernCard,
  SearchBar,
  FloatingActionButton,
  SyncStatusIndicator
} from '../components';
import { Bill, BillStatus, DeliveryStatus } from '../types';
import OfflineApiService from '../services/offlineApiService';

interface BillingScreenProps {
  navigation: any;
  route?: {
    params?: {
      filterDate?: string;
    };
  };
}

export const BillingScreen: React.FC<BillingScreenProps> = ({
  navigation,
  route
}) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [billingDateFilter, setBillingDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [customBillingStartDate, setCustomBillingStartDate] = useState<Date | null>(null);
  const [customBillingEndDate, setCustomBillingEndDate] = useState<Date | null>(null);
  const [customDeliveryStartDate, setCustomDeliveryStartDate] = useState<Date | null>(null);
  const [customDeliveryEndDate, setCustomDeliveryEndDate] = useState<Date | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  
  // Temporary filter states for the modal (not applied until "Apply Filters" is clicked)
  const [tempStatusFilter, setTempStatusFilter] = useState<BillStatus | 'all'>('all');
  const [tempBillingDateFilter, setTempBillingDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [tempDeliveryDateFilter, setTempDeliveryDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [tempCustomBillingStartDate, setTempCustomBillingStartDate] = useState<Date | null>(null);
  const [tempCustomBillingEndDate, setTempCustomBillingEndDate] = useState<Date | null>(null);
  const [tempCustomDeliveryStartDate, setTempCustomDeliveryStartDate] = useState<Date | null>(null);
  const [tempCustomDeliveryEndDate, setTempCustomDeliveryEndDate] = useState<Date | null>(null);
  const [tempDeliveryStatusFilter, setTempDeliveryStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  
  // Date picker visibility states
  const [showBillingStartDatePicker, setShowBillingStartDatePicker] = useState(false);
  const [showBillingEndDatePicker, setShowBillingEndDatePicker] = useState(false);
  const [showDeliveryStartDatePicker, setShowDeliveryStartDatePicker] = useState(false);
  const [showDeliveryEndDatePicker, setShowDeliveryEndDatePicker] = useState(false);

  const filterDate = route?.params?.filterDate;

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: 50,
      };

      // Add search text filter
      if (debouncedSearchQuery.trim()) {
        params.searchText = debouncedSearchQuery.trim();
      }

      // Add status filter
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Add delivery status filter
      if (deliveryStatusFilter !== 'all') {
        params.deliveryStatus = deliveryStatusFilter;
      }

      // Add billing date filters
      if (billingDateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (billingDateFilter) {
          case 'today':
            // Use local date string to avoid timezone issues
            const todayStr = today.getFullYear() + '-' + 
              String(today.getMonth() + 1).padStart(2, '0') + '-' + 
              String(today.getDate()).padStart(2, '0');
            params.startDate = todayStr;
            params.endDate = todayStr;
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            const weekAgoStr = weekAgo.getFullYear() + '-' + 
              String(weekAgo.getMonth() + 1).padStart(2, '0') + '-' + 
              String(weekAgo.getDate()).padStart(2, '0');
            const todayWeekStr = today.getFullYear() + '-' + 
              String(today.getMonth() + 1).padStart(2, '0') + '-' + 
              String(today.getDate()).padStart(2, '0');
            params.startDate = weekAgoStr;
            params.endDate = todayWeekStr;
            break;
          case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthStartStr = monthStart.getFullYear() + '-' + 
              String(monthStart.getMonth() + 1).padStart(2, '0') + '-' + 
              String(monthStart.getDate()).padStart(2, '0');
            const monthEndStr = monthEnd.getFullYear() + '-' + 
              String(monthEnd.getMonth() + 1).padStart(2, '0') + '-' + 
              String(monthEnd.getDate()).padStart(2, '0');
            params.startDate = monthStartStr;
            params.endDate = monthEndStr;
            break;
          case 'year':
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const yearEnd = new Date(now.getFullYear(), 11, 31);
            const yearStartStr = yearStart.getFullYear() + '-' + 
              String(yearStart.getMonth() + 1).padStart(2, '0') + '-' + 
              String(yearStart.getDate()).padStart(2, '0');
            const yearEndStr = yearEnd.getFullYear() + '-' + 
              String(yearEnd.getMonth() + 1).padStart(2, '0') + '-' + 
              String(yearEnd.getDate()).padStart(2, '0');
            params.startDate = yearStartStr;
            params.endDate = yearEndStr;
            break;
          case 'custom':
            if (customBillingStartDate) {
              params.startDate = customBillingStartDate.toISOString().split('T')[0];
            }
            if (customBillingEndDate) {
              params.endDate = customBillingEndDate.toISOString().split('T')[0];
            }
            break;
        }
      }

      // Add delivery date filters (we'll need to update backend to support this)
      if (deliveryDateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (deliveryDateFilter) {
          case 'today':
            // Use local date string to avoid timezone issues
            const todayDeliveryStr = today.getFullYear() + '-' + 
              String(today.getMonth() + 1).padStart(2, '0') + '-' + 
              String(today.getDate()).padStart(2, '0');
            params.deliveryStartDate = todayDeliveryStr;
            params.deliveryEndDate = todayDeliveryStr;
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            const weekAgoDeliveryStr = weekAgo.getFullYear() + '-' + 
              String(weekAgo.getMonth() + 1).padStart(2, '0') + '-' + 
              String(weekAgo.getDate()).padStart(2, '0');
            const todayWeekDeliveryStr = today.getFullYear() + '-' + 
              String(today.getMonth() + 1).padStart(2, '0') + '-' + 
              String(today.getDate()).padStart(2, '0');
            params.deliveryStartDate = weekAgoDeliveryStr;
            params.deliveryEndDate = todayWeekDeliveryStr;
            break;
          case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthStartDeliveryStr = monthStart.getFullYear() + '-' + 
              String(monthStart.getMonth() + 1).padStart(2, '0') + '-' + 
              String(monthStart.getDate()).padStart(2, '0');
            const monthEndDeliveryStr = monthEnd.getFullYear() + '-' + 
              String(monthEnd.getMonth() + 1).padStart(2, '0') + '-' + 
              String(monthEnd.getDate()).padStart(2, '0');
            params.deliveryStartDate = monthStartDeliveryStr;
            params.deliveryEndDate = monthEndDeliveryStr;
            break;
          case 'year':
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const yearEnd = new Date(now.getFullYear(), 11, 31);
            const yearStartDeliveryStr = yearStart.getFullYear() + '-' + 
              String(yearStart.getMonth() + 1).padStart(2, '0') + '-' + 
              String(yearStart.getDate()).padStart(2, '0');
            const yearEndDeliveryStr = yearEnd.getFullYear() + '-' + 
              String(yearEnd.getMonth() + 1).padStart(2, '0') + '-' + 
              String(yearEnd.getDate()).padStart(2, '0');
            params.deliveryStartDate = yearStartDeliveryStr;
            params.deliveryEndDate = yearEndDeliveryStr;
            break;
          case 'custom':
            if (customDeliveryStartDate) {
              params.deliveryStartDate = customDeliveryStartDate.toISOString().split('T')[0];
            }
            if (customDeliveryEndDate) {
              params.deliveryEndDate = customDeliveryEndDate.toISOString().split('T')[0];
            }
            break;
        }
      }

      const billsResponse = await OfflineApiService.getBills(params);

      // Fetch customer details for each bill
      const billsWithCustomers = await Promise.all(
        billsResponse.items.map(async (bill) => {
          try {
            // Always try to fetch fresh customer data
            const customer = await OfflineApiService.getCustomerById(bill.customerId);
            return { ...bill, customer };
          } catch (error) {
            console.warn(`Failed to load customer ${bill.customerId}:`, error);
            // Try to get customer info from cache or return placeholder
            try {
              // Attempt to get cached customer data
              const cachedCustomer = await OfflineApiService.getCustomerById(bill.customerId);
              return { ...bill, customer: cachedCustomer };
            } catch (cacheError) {
              console.warn(`No cached customer data for ${bill.customerId}:`, cacheError);
              // Return bill with placeholder customer data
              return {
                ...bill,
                customer: {
                  id: bill.customerId,
                  personalDetails: {
                    name: 'Customer Name Not Available',
                    phone: 'Phone Not Available',
                    email: '',
                    address: '',
                    dob: '',
                  },
                  measurements: [],
                  comments: '',
                  createdAt: '',
                  updatedAt: '',
                }
              };
            }
          }
        })
      );

      setBills(billsWithCustomers);
      setFilteredBills(billsWithCustomers);
    } catch (error) {
      console.error('Error loading bills:', error);
      Alert.alert('Error', 'Failed to load bills. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filterDate, debouncedSearchQuery, statusFilter, deliveryStatusFilter, billingDateFilter, deliveryDateFilter, customBillingStartDate, customBillingEndDate, customDeliveryStartDate, customDeliveryEndDate]);

  const refreshBills = useCallback(async () => {
    setIsRefreshing(true);
    await loadBills();
  }, [loadBills]);

  useEffect(() => {
    navigation.setOptions({
      title: filterDate ? `Bills for ${new Date(filterDate).toLocaleDateString()}` : 'Billing',
      headerRight: () => (
        <View style={styles.headerActions}>
          <SyncStatusIndicator compact />
          <TouchableOpacity
            onPress={() => navigation.navigate('BillingConfig')}
            style={styles.headerButton}
          >
            <MaterialIcon name="settings" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Calendar')}
            style={styles.headerButton}
          >
            <MaterialIcon name="calendar-today" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, filterDate]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Update loadBills dependency to use debounced search query
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) return; // Wait for debounce
    loadBills();
  }, [debouncedSearchQuery, statusFilter, deliveryStatusFilter, billingDateFilter, deliveryDateFilter, filterDate]);



  const getStatusColor = (status: BillStatus): string => {
    switch (status) {
      case 'fully_paid': return '#34C759';
      case 'partially_paid': return '#FF9500';
      case 'unpaid': return '#FF3B30';
      case 'draft': return '#666';
      case 'cancelled': return '#999';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: BillStatus): string => {
    switch (status) {
      case 'fully_paid': return 'Fully Paid';
      case 'partially_paid': return 'Partially Paid';
      case 'unpaid': return 'Unpaid';
      case 'draft': return 'Draft';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getDeliveryStatusColor = (status: DeliveryStatus): string => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'ready_for_delivery': return '#34C759';
      case 'delivered': return '#30D158';
      case 'cancelled': return '#FF3B30';
      default: return '#666';
    }
  };

  const getDeliveryStatusLabel = (status: DeliveryStatus): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'ready_for_delivery': return 'Ready';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleBillPress = (bill: Bill) => {
    navigation.navigate('BillDetail', {
      billId: bill.id,
      bill,
    });
  };

  const handlePrintBill = (bill: Bill) => {
    navigation.navigate('BillPrint', {
      billId: bill.id,
    });
  };

  const handleReceivedItems = (bill: Bill) => {
    navigation.navigate('ItemsManagement', {
      billId: bill.id,
      bill,
    });
  };





  const renderBillCard = (bill: Bill) => (
    <ModernCard key={bill.id} style={styles.billCard}>
      <TouchableOpacity
        onPress={() => handleBillPress(bill)}
        style={styles.billCardContent}
      >
        <View style={styles.billHeader}>
          <View style={styles.billTitleContainer}>
            <Text style={styles.billNumber}>{bill.billNumber}</Text>
            <View style={styles.statusBadges}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(bill.status) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(bill.status) }
                ]}>
                  {getStatusLabel(bill.status)}
                </Text>
              </View>
              {bill.deliveryStatus && (
                <View style={[
                  styles.deliveryStatusBadge,
                  { backgroundColor: getDeliveryStatusColor(bill.deliveryStatus) + '20' }
                ]}>
                  <Text style={[
                    styles.deliveryStatusText,
                    { color: getDeliveryStatusColor(bill.deliveryStatus) }
                  ]}>
                    {getDeliveryStatusLabel(bill.deliveryStatus)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.billDate}>
            {new Date(bill.billingDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {bill.customer?.personalDetails?.name || 'Customer Name Not Available'}
          </Text>
          <Text style={styles.customerPhone}>
            {bill.customer?.personalDetails?.phone || 'Phone Not Available'}
          </Text>
        </View>

        <View style={styles.billAmounts}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total:</Text>
            <Text style={styles.totalAmount}>₹{bill.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Paid:</Text>
            <Text style={[styles.paidAmount, { color: '#34C759' }]}>
              ₹{(() => {
                const calculatedPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                return calculatedPaidAmount.toFixed(2);
              })()}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Outstanding:</Text>
            <Text style={[
              styles.outstandingAmount,
              {
                color: (() => {
                  const calculatedPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                  const calculatedOutstandingAmount = bill.totalAmount - calculatedPaidAmount;
                  return calculatedOutstandingAmount > 0 ? '#FF3B30' : '#34C759';
                })()
              }
            ]}>
              ₹{(() => {
                const calculatedPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                const calculatedOutstandingAmount = bill.totalAmount - calculatedPaidAmount;
                return calculatedOutstandingAmount.toFixed(2);
              })()}
            </Text>
          </View>
        </View>

        <View style={styles.billDates}>
          <Text style={styles.dateInfo}>
            Delivery: {new Date(bill.deliveryDate).toLocaleDateString()}
          </Text>
          <Text style={styles.itemCount}>
            {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.billActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePrintBill(bill)}
        >
          <MaterialIcon name="print" size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleReceivedItems(bill)}
        >
          <MaterialIcon name="inventory" size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>Items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleBillPress(bill)}
        >
          <MaterialIcon name="visibility" size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    </ModernCard>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcon name="receipt" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>
        {searchQuery || statusFilter !== 'all' ? 'No bills found' : 'No bills yet'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Create your first bill to get started'
        }
      </Text>
      {!searchQuery && statusFilter === 'all' && (
        <ModernButton
          title="Create Bill"
          onPress={() => navigation.navigate('BillingForm', { mode: 'add' })}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  const renderStats = () => {
    const totalBills = bills.length;
    const unpaidBills = bills.filter(b => b.status === 'unpaid').length;
    const partiallyPaidBills = bills.filter(b => b.status === 'partially_paid').length;
    const fullyPaidBills = bills.filter(b => b.status === 'fully_paid').length;
    const totalOutstanding = bills.reduce((sum, bill) => {
      const calculatedPaidAmount = bill.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) || 0;
      const calculatedOutstandingAmount = bill.totalAmount - calculatedPaidAmount;
      return sum + calculatedOutstandingAmount;
    }, 0);

    return (
      <ModernCard style={[
        styles.statsCard,
        !isOverviewExpanded && styles.statsCardCollapsed
      ]}>
        <TouchableOpacity
          style={[
            styles.statsHeader,
            !isOverviewExpanded && styles.statsHeaderCollapsed
          ]}
          onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
        >
          <Text style={styles.statsTitle}>Overview</Text>
          <MaterialIcon
            name={isOverviewExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color="#666"
          />
        </TouchableOpacity>

        {isOverviewExpanded && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalBills}</Text>
                <Text style={styles.statLabel}>Total Bills</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{unpaidBills}</Text>
                <Text style={styles.statLabel}>Unpaid</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#FF9500' }]}>{partiallyPaidBills}</Text>
                <Text style={styles.statLabel}>Partial</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#34C759' }]}>{fullyPaidBills}</Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
            </View>
            <View style={styles.outstandingTotal}>
              <Text style={styles.outstandingLabel}>Total Outstanding:</Text>
              <Text style={[
                styles.outstandingValue,
                { color: totalOutstanding > 0 ? '#FF3B30' : '#34C759' }
              ]}>
                ₹{totalOutstanding.toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </ModernCard>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading bills..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search bills, customers, or phone numbers..."
          style={styles.searchBar}
        />

        {bills.length > 0 && renderStats()}

        <ScrollView
          style={styles.billsList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshBills}
            />
          }
          onScroll={() => {
            if (showFilterModal) {
              setShowFilterModal(false);
            }
          }}
          scrollEventThrottle={16}
        >
          {filteredBills.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredBills.map(renderBillCard)
          )}
        </ScrollView>
      </View>

      {/* Floating Filter Button */}
      <TouchableOpacity
        style={[styles.filterFab, { backgroundColor: '#007AFF' }]}
        onPress={() => {
          // Initialize temporary filters with current filter values
          setTempStatusFilter(statusFilter);
          setTempBillingDateFilter(billingDateFilter);
          setTempDeliveryDateFilter(deliveryDateFilter);
          setTempCustomBillingStartDate(customBillingStartDate);
          setTempCustomBillingEndDate(customBillingEndDate);
          setTempCustomDeliveryStartDate(customDeliveryStartDate);
          setTempCustomDeliveryEndDate(customDeliveryEndDate);
          setTempDeliveryStatusFilter(deliveryStatusFilter);
          setShowFilterModal(true);
        }}
        activeOpacity={0.8}
      >
        <MaterialIcon name="filter" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Filters & Sorting
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              {/* Status Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>
                  Filter by Status
                </Text>
                <View style={styles.optionsContainer}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'unpaid', label: 'Unpaid' },
                    { key: 'partially_paid', label: 'Partially Paid' },
                    { key: 'fully_paid', label: 'Fully Paid' },
                    { key: 'draft', label: 'Draft' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: tempStatusFilter === option.key
                            ? '#007AFF'
                            : '#F8F9FA',
                        },
                      ]}
                      onPress={() => setTempStatusFilter(option.key as BillStatus | 'all')}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: tempStatusFilter === option.key
                              ? '#FFF'
                              : '#000',
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Billing Date Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>
                  Filter by Billing Date
                </Text>
                <View style={styles.optionsContainer}>
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                    { key: 'year', label: 'This Year' },
                    { key: 'custom', label: 'Custom Range' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: tempBillingDateFilter === option.key
                            ? '#34C759'
                            : '#F8F9FA',
                        },
                      ]}
                      onPress={() => setTempBillingDateFilter(option.key as 'all' | 'today' | 'week' | 'month' | 'year' | 'custom')}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: tempBillingDateFilter === option.key
                              ? '#FFF'
                              : '#000',
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Custom Billing Date Range */}
                {tempBillingDateFilter === 'custom' && (
                  <View style={styles.customDateContainer}>
                    <View style={styles.datePickerRow}>
                      <Text style={styles.dateLabel}>From:</Text>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowBillingStartDatePicker(true)}
                      >
                        <Text style={styles.datePickerText}>
                          {tempCustomBillingStartDate ? tempCustomBillingStartDate.toLocaleDateString() : 'Select Date'}
                        </Text>
                        <MaterialIcon name="calendar-today" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.datePickerRow}>
                      <Text style={styles.dateLabel}>To:</Text>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowBillingEndDatePicker(true)}
                      >
                        <Text style={styles.datePickerText}>
                          {tempCustomBillingEndDate ? tempCustomBillingEndDate.toLocaleDateString() : 'Select Date'}
                        </Text>
                        <MaterialIcon name="calendar-today" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Delivery Date Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>
                  Filter by Delivery Date
                </Text>
                <View style={styles.optionsContainer}>
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                    { key: 'year', label: 'This Year' },
                    { key: 'custom', label: 'Custom Range' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: tempDeliveryDateFilter === option.key
                            ? '#007AFF'
                            : '#F8F9FA',
                        },
                      ]}
                      onPress={() => setTempDeliveryDateFilter(option.key as 'all' | 'today' | 'week' | 'month' | 'year' | 'custom')}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: tempDeliveryDateFilter === option.key
                              ? '#FFF'
                              : '#000',
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Delivery Status Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>
                  Filter by Delivery Status
                </Text>
                <View style={styles.optionsContainer}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'in_progress', label: 'In Progress' },
                    { key: 'ready_for_delivery', label: 'Ready for Delivery' },
                    { key: 'delivered', label: 'Delivered' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: tempDeliveryStatusFilter === option.key
                            ? '#FF9500'
                            : '#F8F9FA',
                        },
                      ]}
                      onPress={() => setTempDeliveryStatusFilter(option.key as DeliveryStatus | 'all')}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: tempDeliveryStatusFilter === option.key
                              ? '#FFF'
                              : '#000',
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: '#F8F9FA' }]}
                onPress={() => {
                  setTempStatusFilter('all');
                  setTempBillingDateFilter('all');
                  setTempDeliveryDateFilter('all');
                  setTempCustomBillingStartDate(null);
                  setTempCustomBillingEndDate(null);
                  setTempCustomDeliveryStartDate(null);
                  setTempCustomDeliveryEndDate(null);
                  setTempDeliveryStatusFilter('all');
                }}
              >
                <Text style={[styles.resetButtonText, { color: '#000' }]}>
                  Reset All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: '#007AFF' }]}
                onPress={() => {
                  // Apply the temporary filters to the actual filter states
                  setStatusFilter(tempStatusFilter);
                  setBillingDateFilter(tempBillingDateFilter);
                  setDeliveryDateFilter(tempDeliveryDateFilter);
                  setCustomBillingStartDate(tempCustomBillingStartDate);
                  setCustomBillingEndDate(tempCustomBillingEndDate);
                  setCustomDeliveryStartDate(tempCustomDeliveryStartDate);
                  setCustomDeliveryEndDate(tempCustomDeliveryEndDate);
                  setDeliveryStatusFilter(tempDeliveryStatusFilter);
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.applyButtonText}>
                  Apply Filters
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showBillingStartDatePicker && (
        <DateTimePicker
          value={tempCustomBillingStartDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowBillingStartDatePicker(false);
            if (selectedDate) {
              setTempCustomBillingStartDate(selectedDate);
            }
          }}
        />
      )}

      {showBillingEndDatePicker && (
        <DateTimePicker
          value={tempCustomBillingEndDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowBillingEndDatePicker(false);
            if (selectedDate) {
              setTempCustomBillingEndDate(selectedDate);
            }
          }}
        />
      )}

      {showDeliveryStartDatePicker && (
        <DateTimePicker
          value={tempCustomDeliveryStartDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDeliveryStartDatePicker(false);
            if (selectedDate) {
              setTempCustomDeliveryStartDate(selectedDate);
            }
          }}
        />
      )}

      {showDeliveryEndDatePicker && (
        <DateTimePicker
          value={tempCustomDeliveryEndDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDeliveryEndDatePicker(false);
            if (selectedDate) {
              setTempCustomDeliveryEndDate(selectedDate);
            }
          }}
        />
      )}

      <FloatingActionButton
        onPress={() => navigation.navigate('BillingForm', { mode: 'add' })}
        icon="add"
        testID="add-bill-fab"
        style={styles.addBillFab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  statusFilterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  statusFilterContainer: {
    flex: 1,
    maxHeight: 40,
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    minWidth: 60,
    alignItems: 'center',
  },
  statusFilterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusFilterTextActive: {
    color: '#FFF',
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIconButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterIconText: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateFilterContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    maxHeight: 40,
  },
  dateFilters: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  dateFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    minWidth: 70,
    alignItems: 'center',
  },
  dateFilterButtonActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  dateFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateFilterTextActive: {
    color: '#FFF',
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
  },
  statsCardCollapsed: {
    marginBottom: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsHeaderCollapsed: {
    marginBottom: 0,
    paddingVertical: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  outstandingTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  outstandingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  outstandingValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  billsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  billCard: {
    marginBottom: 12,
  },
  billCardContent: {
    marginBottom: 12,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deliveryStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryStatusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  billDate: {
    fontSize: 14,
    color: '#666',
  },
  customerInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  billAmounts: {
    marginBottom: 12,
    gap: 4,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  outstandingAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  billDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    fontSize: 12,
    color: '#666',
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
  },
  billActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    minWidth: 160,
  },
  // Floating Filter Button Styles
  filterFab: {
    position: 'absolute',
    bottom: 140, // Increased space between the two FABs
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalContentContainer: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  filterSection: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    gap: 16,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addBillFab: {
    bottom: 40, // Increased space from bottom
  },
  // Custom Date Range Styles
  customDateContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    width: 50,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    marginLeft: 12,
  },
  datePickerText: {
    fontSize: 14,
    color: '#000',
  },
});