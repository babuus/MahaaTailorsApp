import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Modal,
    ScrollView,
} from 'react-native';
import { MaterialIcon, LoadingSpinner, SearchBar, ModernCard } from '../components';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { apiService } from '../services';

interface BillItem {
    id: string;
    billId: string;
    type: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    configItemId?: string;
    materialSource?: string;
    deliveryStatus: string;
    internalNotes?: string; // Add internal notes support
    createdAt: number;
    updatedAt: number;
}

interface BillItemsResponse {
    items: BillItem[];
    hasMore: boolean;
}

type GroupBy = 'none' | 'billId' | 'date' | 'type' | 'status';
type SortBy = 'name' | 'date' | 'amount' | 'status';

interface BillingItemsScreenProps {
    navigation: any;
}

const BillingItemsScreen: React.FC<BillingItemsScreenProps> = ({ navigation }) => {
    const [items, setItems] = useState<BillItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [showFilterModal, setShowFilterModal] = useState(false);

    const { isDarkMode } = useThemeContext();

    const fetchBillItems = useCallback(async (refresh = false) => {
        try {
            if (refresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            // Build query parameters
            const params: any = { limit: 100 };
            if (filterStatus !== 'all') {
                params.deliveryStatus = filterStatus;
            }
            if (filterType !== 'all') {
                params.type = filterType;
            }

            const response = await apiService.getBillItems(params);
            setItems(response.items);
        } catch (error) {
            console.error('Error fetching bill items:', error);
            Alert.alert('Error', 'Failed to fetch billing items');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filterStatus, filterType]);

    useEffect(() => {
        fetchBillItems();
    }, [fetchBillItems]);

    const filteredItems = items.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.internalNotes?.toLowerCase().includes(query) ||
            item.billId.toLowerCase().includes(query)
        );
    });

    const sortedItems = [...filteredItems].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'date':
                return b.createdAt - a.createdAt;
            case 'amount':
                return b.totalPrice - a.totalPrice;
            case 'status':
                return a.deliveryStatus.localeCompare(b.deliveryStatus);
            default:
                return 0;
        }
    });

    const groupedItems = groupBy === 'none' ?
        [{ key: 'all', title: 'All Items', data: sortedItems }] :
        groupItemsBy(sortedItems, groupBy);

    function groupItemsBy(items: BillItem[], groupBy: GroupBy) {
        const groups: { [key: string]: BillItem[] } = {};

        items.forEach(item => {
            let groupKey: string;
            let groupTitle: string;

            switch (groupBy) {
                case 'billId':
                    groupKey = item.billId;
                    groupTitle = `Bill: ${item.billId}`;
                    break;
                case 'date':
                    const date = new Date(item.createdAt * 1000);
                    groupKey = date.toDateString();
                    groupTitle = date.toLocaleDateString();
                    break;
                case 'type':
                    groupKey = item.type;
                    groupTitle = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                    break;
                case 'status':
                    groupKey = item.deliveryStatus;
                    groupTitle = item.deliveryStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    break;
                default:
                    groupKey = 'all';
                    groupTitle = 'All Items';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });

        return Object.entries(groups).map(([key, data]) => ({
            key,
            title: groups[key].length > 0 ?
                `${key === 'all' ? 'All Items' :
                    groupBy === 'billId' ? `Bill: ${key}` :
                        groupBy === 'date' ? new Date(data[0].createdAt * 1000).toLocaleDateString() :
                            groupBy === 'type' ? key.charAt(0).toUpperCase() + key.slice(1) :
                                key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                } (${data.length})` : key,
            data
        })).filter(group => group.data.length > 0);
    }

    const renderBillItem = ({ item }: { item: BillItem }) => (
        <ModernCard style={styles.itemCard}>
            <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                    {item.name}
                </Text>
                <View style={[styles.statusBadge, getStatusBadgeStyle(item.deliveryStatus)]}>
                    <Text style={styles.statusText}>
                        {item.deliveryStatus.replace('_', ' ').toUpperCase()}
                    </Text>
                </View>
            </View>

            {item.description && (
                <Text style={[styles.itemDescription, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]}>
                    {item.description}
                </Text>
            )}

            {/* Internal Notes */}
            {item.internalNotes && item.internalNotes.trim() !== '' && (
                <View style={styles.internalNotesContainer}>
                    <View style={styles.internalNotesHeader}>
                        <MaterialIcon name="lock" size={14} color="#FF9500" />
                        <Text style={[styles.internalNotesLabel, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                            Staff Notes
                        </Text>
                        <Text style={styles.internalNotesPrivateLabel}>PRIVATE</Text>
                    </View>
                    <Text style={[styles.internalNotesText, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]} numberOfLines={2}>
                        {item.internalNotes}
                    </Text>
                </View>
            )}

            <View style={styles.itemDetails}>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]}>
                        Bill ID:
                    </Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                        {item.billId}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]}>
                        Quantity:
                    </Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                        {item.quantity}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]}>
                        Unit Price:
                    </Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                        ₹{item.unitPrice.toFixed(2)}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]}>
                        Total:
                    </Text>
                    <Text style={[styles.totalPrice, { color: COLORS.PRIMARY }]}>
                        ₹{item.totalPrice.toFixed(2)}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]}>
                        Type:
                    </Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY }]}>
                        Created:
                    </Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                        {new Date(item.createdAt * 1000).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        </ModernCard>
    );

    const renderGroupHeader = (title: string) => (
        <View style={[styles.groupHeader, { backgroundColor: isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT }]}>
            <Text style={[styles.groupTitle, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                {title}
            </Text>
        </View>
    );

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'pending':
                return { backgroundColor: COLORS.WARNING };
            case 'in_progress':
                return { backgroundColor: COLORS.INFO };
            case 'ready_for_delivery':
                return { backgroundColor: COLORS.SUCCESS };
            case 'delivered':
                return { backgroundColor: COLORS.SUCCESS };
            case 'cancelled':
                return { backgroundColor: COLORS.ERROR };
            default:
                return { backgroundColor: COLORS.TEXT_SECONDARY };
        }
    };



    const getGroupByLabel = (groupBy: GroupBy) => {
        switch (groupBy) {
            case 'none': return 'None';
            case 'billId': return 'Bill ID';
            case 'date': return 'Date';
            case 'type': return 'Type';
            case 'status': return 'Status';
            default: return 'None';
        }
    };

    const getSortByLabel = (sortBy: SortBy) => {
        switch (sortBy) {
            case 'name': return 'Name';
            case 'date': return 'Date';
            case 'amount': return 'Amount';
            case 'status': return 'Status';
            default: return 'Date';
        }
    };



    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT }]}>
                <LoadingSpinner />
                <Text style={[styles.loadingText, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                    Loading billing items...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT }]}>
            <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search items..."
                style={styles.searchBar}
            />

            <FlatList
                data={groupedItems}
                keyExtractor={(item) => item.key}
                renderItem={({ item: group }) => (
                    <View>
                        {groupBy !== 'none' && renderGroupHeader(group.title)}
                        <FlatList
                            data={group.data}
                            keyExtractor={(item) => item.id}
                            renderItem={renderBillItem}
                            scrollEnabled={false}
                        />
                    </View>
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchBillItems(true)}
                        colors={[COLORS.PRIMARY]}
                        tintColor={COLORS.PRIMARY}
                    />
                }
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* Floating Action Button for Filter */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: COLORS.PRIMARY }]}
                onPress={() => setShowFilterModal(true)}
                activeOpacity={0.8}
            >
                <MaterialIcon name="filter-list" size={24} color={COLORS.LIGHT} />
            </TouchableOpacity>

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                                Filters & Sorting
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowFilterModal(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcon name="close" size={24} color={isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={styles.modalContentContainer}
                            showsVerticalScrollIndicator={true}
                            bounces={true}
                        >
                            {/* Group By Section */}
                            <View style={styles.filterSection}>
                                <Text style={[styles.sectionTitle, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                                    Group By
                                </Text>
                                <View style={styles.optionsContainer}>
                                    {[
                                        { key: 'none', label: 'None' },
                                        { key: 'billId', label: 'Bill ID' },
                                        { key: 'date', label: 'Date' },
                                        { key: 'type', label: 'Type' },
                                        { key: 'status', label: 'Status' },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.key}
                                            style={[
                                                styles.optionButton,
                                                {
                                                    backgroundColor: groupBy === option.key
                                                        ? COLORS.PRIMARY
                                                        : (isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT),
                                                },
                                            ]}
                                            onPress={() => setGroupBy(option.key as GroupBy)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    {
                                                        color: groupBy === option.key
                                                            ? COLORS.LIGHT
                                                            : (isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY),
                                                    },
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Sort By Section */}
                            <View style={styles.filterSection}>
                                <Text style={[styles.sectionTitle, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                                    Sort By
                                </Text>
                                <View style={styles.optionsContainer}>
                                    {[
                                        { key: 'name', label: 'Name' },
                                        { key: 'date', label: 'Date' },
                                        { key: 'amount', label: 'Amount' },
                                        { key: 'status', label: 'Status' },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.key}
                                            style={[
                                                styles.optionButton,
                                                {
                                                    backgroundColor: sortBy === option.key
                                                        ? COLORS.PRIMARY
                                                        : (isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT),
                                                },
                                            ]}
                                            onPress={() => setSortBy(option.key as SortBy)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    {
                                                        color: sortBy === option.key
                                                            ? COLORS.LIGHT
                                                            : (isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY),
                                                    },
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Filter by Status Section */}
                            <View style={styles.filterSection}>
                                <Text style={[styles.sectionTitle, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                                    Filter by Status
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
                                                    backgroundColor: filterStatus === option.key
                                                        ? COLORS.PRIMARY
                                                        : (isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT),
                                                },
                                            ]}
                                            onPress={() => setFilterStatus(option.key)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    {
                                                        color: filterStatus === option.key
                                                            ? COLORS.LIGHT
                                                            : (isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY),
                                                    },
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Filter by Type Section */}
                            <View style={styles.filterSection}>
                                <Text style={[styles.sectionTitle, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                                    Filter by Type
                                </Text>
                                <View style={styles.optionsContainer}>
                                    {[
                                        { key: 'all', label: 'All' },
                                        { key: 'custom', label: 'Custom' },
                                        { key: 'template', label: 'Template' },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.key}
                                            style={[
                                                styles.optionButton,
                                                {
                                                    backgroundColor: filterType === option.key
                                                        ? COLORS.PRIMARY
                                                        : (isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT),
                                                },
                                            ]}
                                            onPress={() => setFilterType(option.key)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    {
                                                        color: filterType === option.key
                                                            ? COLORS.LIGHT
                                                            : (isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY),
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
                                style={[styles.resetButton, { backgroundColor: isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT }]}
                                onPress={() => {
                                    setGroupBy('none');
                                    setSortBy('date');
                                    setFilterStatus('all');
                                    setFilterType('all');
                                }}
                            >
                                <Text style={[styles.resetButtonText, { color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY }]}>
                                    Reset All
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.applyButton, { backgroundColor: COLORS.PRIMARY }]}
                                onPress={() => setShowFilterModal(false)}
                            >
                                <Text style={styles.applyButtonText}>
                                    Apply Filters
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SPACING.MD,
        fontSize: 16,
    },
    searchBar: {
        margin: SPACING.MD,
    },
    filterContainer: {
        paddingHorizontal: SPACING.MD,
        paddingBottom: SPACING.MD,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.SM,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.SM,
        borderRadius: 8,
        minWidth: 120,
        justifyContent: 'space-between',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContainer: {
        paddingBottom: SPACING.XL,
    },
    groupHeader: {
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.SM,
        marginHorizontal: SPACING.MD,
        marginTop: SPACING.MD,
        borderRadius: 8,
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    itemCard: {
        margin: SPACING.MD,
        marginTop: SPACING.SM,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.SM,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        marginRight: SPACING.LG,
    },
    statusBadge: {
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.XS,
        borderRadius: 12,
        marginLeft: SPACING.MD,
    },
    statusText: {
        color: COLORS.LIGHT,
        fontSize: 12,
        fontWeight: '600',
    },
    itemDescription: {
        fontSize: 14,
        marginBottom: SPACING.MD,
        lineHeight: 20,
    },
    internalNotesContainer: {
        backgroundColor: '#FFF8E1',
        borderWidth: 1,
        borderColor: '#FF9500',
        borderRadius: 8,
        padding: SPACING.SM,
        marginBottom: SPACING.MD,
    },
    internalNotesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    internalNotesLabel: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    internalNotesPrivateLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FF3B30',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
        overflow: 'hidden',
    },
    internalNotesText: {
        fontSize: 13,
        lineHeight: 18,
    },
    itemDetails: {
        gap: SPACING.XS,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '400',
    },
    totalPrice: {
        fontSize: 16,
        fontWeight: '700',
    },
    // Header and Filter Toggle Styles
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.MD,
        paddingBottom: SPACING.SM,
        gap: SPACING.SM,
    },
    filterToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.SM,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        gap: SPACING.XS,
    },
    filterToggleText: {
        fontSize: 14,
        fontWeight: '500',
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
        height: '90%',
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
        paddingHorizontal: SPACING.LG,
        paddingVertical: SPACING.MD,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BORDER_LIGHT,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    closeButton: {
        padding: SPACING.XS,
        borderRadius: 20,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: SPACING.LG,
    },
    modalContentContainer: {
        paddingBottom: SPACING.LG,
        flexGrow: 1,
    },
    filterSection: {
        marginVertical: SPACING.MD,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: SPACING.SM,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.SM,
    },
    optionButton: {
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.SM,
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
        paddingHorizontal: SPACING.LG,
        paddingVertical: SPACING.MD,
        borderTopWidth: 1,
        borderTopColor: COLORS.BORDER_LIGHT,
        gap: SPACING.MD,
    },
    resetButton: {
        flex: 1,
        paddingVertical: SPACING.MD,
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
        paddingVertical: SPACING.MD,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    applyButtonText: {
        color: COLORS.LIGHT,
        fontSize: 16,
        fontWeight: '600',
    },
    // Floating Action Button Styles
    fab: {
        position: 'absolute',
        bottom: 20,
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
});

export default BillingItemsScreen;