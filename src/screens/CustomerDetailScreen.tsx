import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CustomerStackParamList, Customer, CustomerMeasurement } from '../types';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { 
  LoadingSpinner, 
  ConfirmDialog, 
  SkeletonLoader, 
  SkeletonCard 
} from '../components';
import { apiService } from '../services/api';

type CustomerDetailScreenNavigationProp = StackNavigationProp<
  CustomerStackParamList,
  'CustomerDetail'
>;

type CustomerDetailScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'CustomerDetail'
>;

interface Props {
  navigation: CustomerDetailScreenNavigationProp;
  route: CustomerDetailScreenRouteProp;
}

const CustomerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customer: initialCustomer } = route.params;
  const { isDarkMode } = useThemeContext();

  // State management
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    visible: false,
  });
  // State for measurement slider active indices
  const [measurementActiveIndices, setMeasurementActiveIndices] = useState<Record<string, number>>({});

  // Theme styles
  const containerStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  }), [isDarkMode]);

  const cardStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
  }), [isDarkMode]);

  const textStyle = useMemo(() => ({
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  }), [isDarkMode]);

  const subtextStyle = useMemo(() => ({
    color: isDarkMode ? '#B0B0B0' : '#666666',
  }), [isDarkMode]);

  // Handle phone call
  const handlePhoneCall = useCallback(() => {
    const phoneNumber = customer.personalDetails.phone;
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(() => {
        Alert.alert('Error', 'Unable to make phone call');
      });
    }
  }, [customer.personalDetails.phone]);

  // Handle email
  const handleEmail = useCallback(() => {
    const email = customer.personalDetails.email;
    if (email) {
      Linking.openURL(`mailto:${email}`).catch(() => {
        Alert.alert('Error', 'Unable to open email client');
      });
    }
  }, [customer.personalDetails.email]);

  // Handle edit customer
  const handleEdit = useCallback(() => {
    navigation.navigate('CustomerForm', { customer, mode: 'edit' });
  }, [navigation, customer]);

  // Handle delete customer
  const handleDelete = useCallback(() => {
    setDeleteDialog({ visible: true });
  }, []);

  // Confirm delete customer
  const confirmDelete = useCallback(async () => {
    try {
      setLoading(true);
      await apiService.deleteCustomer(customer.id);

      setDeleteDialog({ visible: false });
      Alert.alert('Success', 'Customer deleted successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete customer';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [customer.id, navigation]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteDialog({ visible: false });
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  }, []);

  // Group measurements by garment type and sort by date (latest first)
  const groupedMeasurements = useMemo(() => {
    const groups: Record<string, CustomerMeasurement[]> = {};
    customer.measurements.forEach(measurement => {
      // Use lowercase garment type as the key for grouping
      const garmentTypeKey = measurement.garmentType.toLowerCase();
      if (!groups[garmentTypeKey]) {
        groups[garmentTypeKey] = [];
      }
      groups[garmentTypeKey].push(measurement);
    });

    // Sort measurements within each group by date (latest first)
    Object.keys(groups).forEach(garmentType => {
      groups[garmentType].sort((a, b) => {
        const dateA = new Date(a.lastMeasuredDate).getTime();
        const dateB = new Date(b.lastMeasuredDate).getTime();
        return dateB - dateA; // Latest first
      });
    });

    return groups;
  }, [customer.measurements]);

  // Render personal details section
  const renderPersonalDetails = () => (
    <View style={[styles.section, cardStyle]}>
      <Text style={[styles.sectionTitle, textStyle]}>Personal Details</Text>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, subtextStyle]}>Name:</Text>
        <Text style={[styles.detailValue, textStyle]}>{customer.personalDetails.name}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, subtextStyle]}>Phone:</Text>
        <TouchableOpacity onPress={handlePhoneCall}>
          <Text style={[styles.detailValue, styles.linkText]}>
            {customer.personalDetails.phone}
          </Text>
        </TouchableOpacity>
      </View>

      {customer.personalDetails.email && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, subtextStyle]}>Email:</Text>
          <TouchableOpacity onPress={handleEmail}>
            <Text style={[styles.detailValue, styles.linkText]}>
              {customer.personalDetails.email}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {customer.personalDetails.address && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, subtextStyle]}>Address:</Text>
          <Text style={[styles.detailValue, textStyle]}>{customer.personalDetails.address}</Text>
        </View>
      )}

      {customer.personalDetails.dob && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, subtextStyle]}>Date of Birth:</Text>
          <Text style={[styles.detailValue, textStyle]}>{formatDate(customer.personalDetails.dob)}</Text>
        </View>
      )}
    </View>
  );

  // Render measurement field
  const renderMeasurementField = (field: { name: string; value: string }) => (
    <View key={field.name} style={styles.measurementField}>
      <Text style={[styles.fieldName, subtextStyle]}>{field.name}:</Text>
      <Text style={[styles.fieldValue, textStyle]}>{field.value}</Text>
    </View>
  );

  // Render single measurement card
  const renderMeasurementCard = (measurement: CustomerMeasurement, index: number) => (
    <View key={measurement.id || index} style={styles.measurementCard}>
      {/* Measurement fields in a grid layout for better readability */}
      <View style={styles.measurementGrid}>
        {measurement.fields.map(renderMeasurementField)}
      </View>

      {measurement.notes && measurement.notes.trim() && (
        <View style={styles.measurementNotes}>
          <Text style={[styles.notesLabel, subtextStyle]}>Notes:</Text>
          <Text style={[styles.notesText, textStyle]}>{measurement.notes}</Text>
        </View>
      )}

      <View style={styles.measurementFooter}>
        <Text style={[styles.measurementDate, subtextStyle]}>
          Last measured: {formatDate(measurement.lastMeasuredDate)}
        </Text>
        {measurement.id && (
          <Text style={[styles.measurementId, subtextStyle]}>
            ID: {measurement.id}
          </Text>
        )}
      </View>
    </View>
  );

  // Render pagination dots
  const renderPaginationDots = (measurements: CustomerMeasurement[], activeIndex: number) => {
    if (measurements.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {measurements.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === activeIndex
                  ? COLORS.PRIMARY
                  : (isDarkMode ? '#666666' : '#CCCCCC')
              }
            ]}
          />
        ))}
      </View>
    );
  };

  // Render measurement group with slider functionality
  const renderMeasurementGroup = (garmentType: string, measurements: CustomerMeasurement[]) => {
    const activeIndex = measurementActiveIndices[garmentType] || 0;
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = screenWidth - (SPACING.MD * 4); // Account for margins and padding

    const handleScroll = (event: any) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / cardWidth);
      setMeasurementActiveIndices(prev => ({
        ...prev,
        [garmentType]: index
      }));
    };

    return (
      <View key={garmentType} style={[styles.section, cardStyle]}>
        <View style={styles.measurementHeader}>
          <Text style={[styles.sectionTitle, textStyle]}>
            {garmentType.charAt(0).toUpperCase() + garmentType.slice(1)} Measurements
          </Text>
          {measurements.length > 1 && (
            <Text style={[styles.measurementCount, subtextStyle]}>
              {activeIndex + 1} of {measurements.length}
            </Text>
          )}
        </View>

        {measurements.length === 1 ? (
          // Single measurement - no slider needed
          <View style={styles.measurementContainer}>
            {renderMeasurementCard(measurements[0], 0)}
          </View>
        ) : (
          // Multiple measurements - show as slider
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.measurementSlider}
              contentContainerStyle={styles.sliderContent}
            >
              {measurements.map((measurement, index) => (
                <View key={measurement.id || index} style={[styles.measurementSlide, { width: cardWidth }]}>
                  {renderMeasurementCard(measurement, index)}
                </View>
              ))}
            </ScrollView>
            {renderPaginationDots(measurements, activeIndex)}
          </>
        )}
      </View>
    );
  };

  // Render measurements section
  const renderMeasurements = () => {
    if (customer.measurements.length === 0) {
      return (
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Measurements</Text>
          <Text style={[styles.emptyText, subtextStyle]}>No measurements recorded yet</Text>
        </View>
      );
    }

    return Object.entries(groupedMeasurements).map(([garmentType, measurements]) =>
      renderMeasurementGroup(garmentType, measurements)
    );
  };

  // Render comments section
  const renderComments = () => {
    if (!customer.comments) return null;

    return (
      <View style={[styles.section, cardStyle]}>
        <Text style={[styles.sectionTitle, textStyle]}>Comments</Text>
        <Text style={[styles.commentsText, textStyle]}>{customer.comments}</Text>
      </View>
    );
  };

  // Render action buttons
  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editButton]}
        onPress={handleEdit}
        disabled={loading}
        accessibilityLabel="Edit customer"
        accessibilityHint="Navigate to edit customer form"
      >
        <Icon name="edit" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={handleDelete}
        disabled={loading}
        accessibilityLabel="Delete customer"
        accessibilityHint="Delete this customer"
      >
        <Icon name="delete" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, containerStyle]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Personal Details Skeleton */}
          <View style={[styles.section, cardStyle]}>
            <SkeletonLoader width="60%" height={20} style={{ marginBottom: SPACING.MD }} />
            <SkeletonLoader width="100%" height={16} style={{ marginBottom: SPACING.SM }} />
            <SkeletonLoader width="80%" height={16} style={{ marginBottom: SPACING.SM }} />
            <SkeletonLoader width="90%" height={16} style={{ marginBottom: SPACING.SM }} />
            <SkeletonLoader width="70%" height={16} />
          </View>

          {/* Measurements Skeleton */}
          <View style={[styles.section, cardStyle]}>
            <SkeletonLoader width="50%" height={20} style={{ marginBottom: SPACING.MD }} />
            <SkeletonCard showAvatar={false} lines={4} />
          </View>

          {/* Comments Skeleton */}
          <View style={[styles.section, cardStyle]}>
            <SkeletonLoader width="40%" height={20} style={{ marginBottom: SPACING.MD }} />
            <SkeletonLoader width="100%" height={16} style={{ marginBottom: SPACING.XS }} />
            <SkeletonLoader width="85%" height={16} />
          </View>
        </ScrollView>

        {/* Action Buttons Skeleton */}
        <View style={styles.actionButtons}>
          <SkeletonLoader width="45%" height={48} borderRadius={8} style={{ marginRight: SPACING.XS }} />
          <SkeletonLoader width="45%" height={48} borderRadius={8} style={{ marginLeft: SPACING.XS }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderPersonalDetails()}
        {renderMeasurements()}
        {renderComments()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {renderActionButtons()}

      <ConfirmDialog
        visible={deleteDialog.visible}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customer.personalDetails.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for action buttons
  },
  section: {
    margin: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: SPACING.SM,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 100,
    marginRight: SPACING.SM,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    flexWrap: 'wrap',
  },
  linkText: {
    color: COLORS.PRIMARY,
    textDecorationLine: 'underline',
  },
  measurementContainer: {
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  measurementCard: {
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  measurementCount: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  measurementSlider: {
    marginBottom: SPACING.SM,
  },
  sliderContent: {
    paddingHorizontal: 0,
  },
  measurementSlide: {
    paddingHorizontal: SPACING.XS,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  measurementGrid: {
    marginBottom: SPACING.SM,
  },
  measurementField: {
    flexDirection: 'row',
    marginBottom: SPACING.XS,
    alignItems: 'center',
    paddingVertical: 2,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '500',
    width: 120,
    marginRight: SPACING.SM,
    textTransform: 'capitalize',
  },
  fieldValue: {
    fontSize: 14,
    flex: 1,
    fontWeight: '600',
  },
  measurementNotes: {
    marginTop: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: SPACING.XS,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  measurementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  measurementDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  measurementId: {
    fontSize: 10,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.LG,
  },
  commentsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.MD,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.XS,
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: SPACING.XL,
  },
});

export default CustomerDetailScreen;