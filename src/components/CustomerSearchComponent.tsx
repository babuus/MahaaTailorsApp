import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcon from './MaterialIcon';
import { Customer } from '../types';
import { getCustomers } from '../services/api';

interface CustomerSearchComponentProps {
  onCustomerSelect: (customer: Customer) => void;
  selectedCustomer?: Customer | null;
  placeholder?: string;
  style?: any;
  testID?: string;
  navigation?: any; // Navigation prop for redirecting to customer form
}

interface CustomerSearchResult extends Customer {
  isNewCustomer?: boolean;
}

export const CustomerSearchComponent: React.FC<CustomerSearchComponentProps> = ({
  onCustomerSelect,
  selectedCustomer,
  placeholder = "Search customers by name or phone...",
  style,
  testID = "customer-search",
  navigation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);


  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await getCustomers({
        searchText: query.trim(),
        searchField: 'universal',
        limit: 10,
      });

      const results: CustomerSearchResult[] = response.items.map(customer => ({
        ...customer,
        isNewCustomer: false,
      }));

      // Add "Add New Customer" option if no exact matches found
      if (results.length === 0 || !results.some(customer => 
        customer.personalDetails.name.toLowerCase() === query.toLowerCase() ||
        customer.personalDetails.phone === query
      )) {
        results.push({
          id: 'new-customer',
          personalDetails: {
            name: query,
            phone: '',
            email: '',
            address: '',
            dob: '',
          },
          measurements: [],
          comments: '',
          createdAt: '',
          updatedAt: '',
          isNewCustomer: true,
        });
      }

      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching customers:', error);
      Alert.alert('Error', 'Failed to search customers. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleCustomerSelect = (customer: CustomerSearchResult) => {
    if (customer.isNewCustomer) {
      // Navigate to CustomerForm screen with pre-filled name
      if (navigation) {
        navigation.navigate('CustomerForm', { 
          mode: 'add',
          prefillData: {
            personalDetails: {
              name: searchQuery,
              phone: '',
              email: '',
              address: '',
              dob: '',
            }
          }
        });
      } else {
        Alert.alert('Error', 'Navigation not available. Please try again.');
      }
      setShowResults(false);
    } else {
      onCustomerSelect(customer);
      setSearchQuery(customer.personalDetails.name);
      setShowResults(false);
    }
  };



  const renderSearchResult = ({ item }: { item: CustomerSearchResult }) => {
    if (item.isNewCustomer) {
      return (
        <TouchableOpacity
          style={[styles.resultItem, styles.addNewCustomerItem]}
          onPress={() => handleCustomerSelect(item)}
          testID={`${testID}-add-new-customer`}
        >
          <MaterialIcon name="person-add" size={20} color="#007AFF" />
          <View style={styles.resultContent}>
            <Text style={[styles.resultName, styles.addNewCustomerText]}>
              Add New Customer: "{searchQuery}"
            </Text>
            <Text style={styles.resultSubtext}>
              Tap to create a new customer
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleCustomerSelect(item)}
        testID={`${testID}-result-${item.id}`}
      >
        <MaterialIcon name="person" size={20} color="#666" />
        <View style={styles.resultContent}>
          <Text style={styles.resultName}>{item.personalDetails.name}</Text>
          <Text style={styles.resultSubtext}>
            {item.personalDetails.phone}
            {item.personalDetails.email && ` • ${item.personalDetails.email}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.searchContainer}>
        <MaterialIcon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={placeholder}
          testID={`${testID}-input`}
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.loadingIcon} />
        )}
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
            style={styles.clearButton}
            testID={`${testID}-clear`}
          >
            <MaterialIcon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {selectedCustomer && !showResults && (
        <View style={styles.selectedCustomer}>
          <MaterialIcon name="person" size={16} color="#007AFF" />
          <Text style={styles.selectedCustomerText}>
            {selectedCustomer.personalDetails.name} - {selectedCustomer.personalDetails.phone}
          </Text>
        </View>
      )}

      {showResults && (
        <View style={styles.resultsContainer}>
          <ScrollView 
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            testID={`${testID}-results`}
            nestedScrollEnabled={true}
          >
            {searchResults.map((item) => (
              <View key={item.id}>
                {renderSearchResult({ item })}
              </View>
            ))}
          </ScrollView>
        </View>
      )}


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  selectedCustomerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  resultsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    maxHeight: 300,
    marginTop: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addNewCustomerItem: {
    backgroundColor: '#F8F9FF',
  },
  resultContent: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  addNewCustomerText: {
    color: '#007AFF',
  },
  resultSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

});