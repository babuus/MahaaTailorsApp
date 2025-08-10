import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { LoadingSpinner, ModernCard, FloatingActionButton } from '../components';
import { BillingConfigItem, ReceivedItemTemplate } from '../types';
import { 
  getBillingConfigItems, 
  deleteBillingConfigItem,
  getReceivedItemTemplates,
  deleteReceivedItemTemplate 
} from '../services/api';

interface BillingConfigScreenProps {
  navigation: any;
}

export const BillingConfigScreen: React.FC<BillingConfigScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'items' | 'templates'>('items');
  const [billingItems, setBillingItems] = useState<BillingConfigItem[]>([]);
  const [receivedTemplates, setReceivedTemplates] = useState<ReceivedItemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBillingItems = useCallback(async () => {
    try {
      const items = await getBillingConfigItems();
      setBillingItems(items.filter(item => item.isActive));
    } catch (error) {
      console.error('Error loading billing items:', error);
      Alert.alert('Error', 'Failed to load billing items. Please try again.');
    }
  }, []);

  const loadReceivedTemplates = useCallback(async () => {
    try {
      const templates = await getReceivedItemTemplates();
      setReceivedTemplates(templates.filter(template => template.isActive));
    } catch (error) {
      console.error('Error loading received item templates:', error);
      Alert.alert('Error', 'Failed to load received item templates. Please try again.');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadBillingItems(), loadReceivedTemplates()]);
    } finally {
      setLoading(false);
    }
  }, [loadBillingItems, loadReceivedTemplates]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!navigation || !navigation.addListener) {
      return;
    }

    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation, loadData]);

  const handleDeleteBillingItem = useCallback(async (item: BillingConfigItem) => {
    Alert.alert(
      'Delete Billing Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBillingConfigItem(item.id);
              setBillingItems(prev => prev.filter(i => i.id !== item.id));
              Alert.alert('Success', 'Billing item deleted successfully.');
            } catch (error) {
              console.error('Error deleting billing item:', error);
              Alert.alert('Error', 'Failed to delete billing item. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleDeleteReceivedTemplate = useCallback(async (template: ReceivedItemTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReceivedItemTemplate(template.id);
              setReceivedTemplates(prev => prev.filter(t => t.id !== template.id));
              Alert.alert('Success', 'Template deleted successfully.');
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleAddItem = () => {
    if (activeTab === 'items') {
      navigation.navigate('BillingConfigItemForm', { mode: 'add' });
    } else {
      navigation.navigate('ReceivedItemTemplateForm', { mode: 'add' });
    }
  };

  const handleEditItem = (item: BillingConfigItem | ReceivedItemTemplate) => {
    if (activeTab === 'items') {
      navigation.navigate('BillingConfigItemForm', { 
        mode: 'edit', 
        item: item as BillingConfigItem 
      });
    } else {
      navigation.navigate('ReceivedItemTemplateForm', { 
        mode: 'edit', 
        template: item as ReceivedItemTemplate 
      });
    }
  };

  const renderBillingItem = (item: BillingConfigItem) => (
    <ModernCard key={item.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
        </View>
        <View style={styles.itemActions}>
          <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditItem(item)}
              testID={`edit-billing-item-${item.id}`}
            >
              <MaterialIcon name="edit" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteBillingItem(item)}
              testID={`delete-billing-item-${item.id}`}
            >
              <MaterialIcon name="delete" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.itemFooter}>
        <View style={[styles.categoryBadge, styles[`category${item.category}`]]}>
          <Text style={styles.categoryText}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </Text>
        </View>
      </View>
    </ModernCard>
  );

  const renderReceivedTemplate = (template: ReceivedItemTemplate) => (
    <ModernCard key={template.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{template.name}</Text>
          {template.description && (
            <Text style={styles.itemDescription}>{template.description}</Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditItem(template)}
            testID={`edit-template-${template.id}`}
          >
            <MaterialIcon name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteReceivedTemplate(template)}
            testID={`delete-template-${template.id}`}
          >
            <MaterialIcon name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.itemFooter}>
        <View style={[styles.categoryBadge, styles[`template${template.category}`]]}>
          <Text style={styles.categoryText}>
            {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
          </Text>
        </View>
      </View>
    </ModernCard>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcon 
        name={activeTab === 'items' ? 'receipt' : 'inventory'} 
        size={64} 
        color="#C7C7CC" 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'items' ? 'No Billing Items' : 'No Templates'}
      </Text>
      <Text style={styles.emptyMessage}>
        {activeTab === 'items' 
          ? 'Add billing items to configure your services and pricing.'
          : 'Add templates for items you commonly receive from customers.'
        }
      </Text>
      <TouchableOpacity style={styles.emptyAction} onPress={handleAddItem}>
        <MaterialIcon name="add" size={20} color="#007AFF" />
        <Text style={styles.emptyActionText}>
          {activeTab === 'items' ? 'Add Billing Item' : 'Add Template'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading billing configuration..." />
      </SafeAreaView>
    );
  }

  const currentItems = activeTab === 'items' ? billingItems : receivedTemplates;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Billing Configuration</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'items' && styles.activeTab]}
            onPress={() => setActiveTab('items')}
            testID="billing-items-tab"
          >
            <MaterialIcon 
              name="receipt" 
              size={20} 
              color={activeTab === 'items' ? '#007AFF' : '#8E8E93'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'items' && styles.activeTabText
            ]}>
              Billing Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'templates' && styles.activeTab]}
            onPress={() => setActiveTab('templates')}
            testID="received-templates-tab"
          >
            <MaterialIcon 
              name="inventory" 
              size={20} 
              color={activeTab === 'templates' ? '#007AFF' : '#8E8E93'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'templates' && styles.activeTabText
            ]}>
              Received Items
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        testID="billing-config-scroll"
      >
        {currentItems.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.itemsList}>
            {activeTab === 'items' 
              ? billingItems.map(renderBillingItem)
              : receivedTemplates.map(renderReceivedTemplate)
            }
          </View>
        )}
      </ScrollView>

      <FloatingActionButton
        onPress={handleAddItem}
        icon="add"
        testID="add-config-item-fab"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  itemsList: {
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryservice: {
    backgroundColor: '#E3F2FD',
  },
  categorymaterial: {
    backgroundColor: '#F3E5F5',
  },
  categoryalteration: {
    backgroundColor: '#FFF3E0',
  },
  templatesample: {
    backgroundColor: '#E8F5E8',
  },
  templatematerial: {
    backgroundColor: '#F3E5F5',
  },
  templateaccessory: {
    backgroundColor: '#FFF3E0',
  },
  templateother: {
    backgroundColor: '#F5F5F5',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});