import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
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
import { Bill, BillStatus } from '../types';
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
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);

  const filterDate = route?.params?.filterDate;

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: 50,
      };

      if (filterDate) {
        params.startDate = filterDate;
        params.endDate = filterDate;
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
              const cachedCustomer = await OfflineApiService.getCustomerById(bill.customerId, { useCache: true });
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
  }, [filterDate]);

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

  useEffect(() => {
    filterBills();
  }, [bills, searchQuery, statusFilter, dateFilter]);

  const filterBills = () => {
    let filtered = bills;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bill =>
        bill.billNumber.toLowerCase().includes(query) ||
        (bill.customer?.personalDetails?.name?.toLowerCase().includes(query)) ||
        (bill.customer?.personalDetails?.phone?.includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bill => bill.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.billingDate);
        const billDateOnly = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate());

        switch (dateFilter) {
          case 'today':
            return billDateOnly.getTime() === today.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return billDateOnly >= weekAgo && billDateOnly <= today;
          case 'month':
            return billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
          case 'year':
            return billDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredBills(filtered);
  };

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

  const handleBillPress = (bill: Bill) => {
    navigation.navigate('BillingForm', {
      mode: 'edit',
      bill,
    });
  };

  const handlePrintBill = (bill: Bill) => {
    navigation.navigate('BillPrint', {
      billId: bill.id,
    });
  };

  const handleReceivedItems = (bill: Bill) => {
    navigation.navigate('ReceivedItems', {
      billId: bill.id,
      mode: 'edit',
    });
  };

  const renderStatusFilter = () => {
    const statuses: Array<{ key: BillStatus | 'all'; label: string }> = [
      { key: 'all', label: 'All' },
      { key: 'unpaid', label: 'Unpaid' },
      { key: 'partially_paid', label: 'Partial' },
      { key: 'fully_paid', label: 'Paid' },
      { key: 'draft', label: 'Draft' },
    ];

    return (
      <View style={styles.statusFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilterContainer}
        >
          <View style={styles.statusFilters}>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.statusFilterButton,
                  statusFilter === status.key && styles.statusFilterButtonActive,
                ]}
                onPress={() => setStatusFilter(status.key)}
              >
                <Text style={[
                  styles.statusFilterText,
                  statusFilter === status.key && styles.statusFilterTextActive,
                ]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <TouchableOpacity
          style={[
            styles.filterIconButton,
            isDateFilterVisible && styles.filterIconButtonActive
          ]}
          onPress={() => setIsDateFilterVisible(!isDateFilterVisible)}
        >
          <MaterialIcon
            name="down"
            size="md"
            color={isDateFilterVisible ? "#FFF" : "#666"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderDateFilter = () => {
    const dateFilters: Array<{ key: 'all' | 'today' | 'week' | 'month' | 'year'; label: string }> = [
      { key: 'all', label: 'All Time' },
      { key: 'today', label: 'Today' },
      { key: 'week', label: 'This Week' },
      { key: 'month', label: 'This Month' },
      { key: 'year', label: 'This Year' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateFilterContainer}
      >
        <View style={styles.dateFilters}>
          {dateFilters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.dateFilterButton,
                dateFilter === filter.key && styles.dateFilterButtonActive,
              ]}
              onPress={() => setDateFilter(filter.key)}
            >
              <Text style={[
                styles.dateFilterText,
                dateFilter === filter.key && styles.dateFilterTextActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
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
              { color: (() => {
                const calculatedPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                const calculatedOutstandingAmount = bill.totalAmount - calculatedPaidAmount;
                return calculatedOutstandingAmount > 0 ? '#FF3B30' : '#34C759';
              })() }
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
          <MaterialIcon name="edit" size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>Edit</Text>
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

        {renderStatusFilter()}

        {isDateFilterVisible && renderDateFilter()}

        {bills.length > 0 && renderStats()}

        <ScrollView
          style={styles.billsList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshBills}
            />
          }
        >
          {filteredBills.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredBills.map(renderBillCard)
          )}
        </ScrollView>
      </View>

      <FloatingActionButton
        onPress={() => navigation.navigate('BillingForm', { mode: 'add' })}
        icon="add"
        testID="add-bill-fab"
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
});