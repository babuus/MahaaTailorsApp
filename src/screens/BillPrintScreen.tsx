import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { WebView } from 'react-native-webview'; // Temporarily disabled due to linking issues
// Import with error handling for linking issues
let RNPrint: any = null;
try {
  RNPrint = require('react-native-print').default;
} catch (error) {
  console.warn('react-native-print not available:', error);
}

// Import for image generation
import { captureRef } from 'react-native-view-shot';
import MaterialIcon from '../components/MaterialIcon';
import { LoadingSpinner, ModernButton, ModernCard } from '../components';
import { Bill } from '../types';
import { getBillById } from '../services/api';
import OfflineApiService from '../services/offlineApiService';
import { 
  BillPrintService, 
  BillPrintData, 
  PrintOptions, 
  ShopInfo 
} from '../services/BillPrintService';

interface BillPrintScreenProps {
  navigation: any;
  route: {
    params: {
      billId: string;
    };
  };
}

const { width: screenWidth } = Dimensions.get('window');

export const BillPrintScreen: React.FC<BillPrintScreenProps> = ({
  navigation,
  route,
}) => {
  const { billId } = route.params;
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(true);
  const billImageRef = React.useRef<View>(null);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    format: 'html',
    includeShopLogo: true,
    includePaymentHistory: true,
    includeReceivedItems: true,
    paperSize: 'A4',
  });

  const loadBill = useCallback(async () => {
    setIsLoading(true);
    try {
      const billData = await getBillById(billId);
      
      // Ensure customer information is loaded for printing
      if (billData.customerId && (!billData.customer || !billData.customer.personalDetails)) {
        try {
          const customer = await OfflineApiService.getCustomerById(billData.customerId);
          billData.customer = customer;
        } catch (customerError) {
          console.warn(`Failed to load customer ${billData.customerId} for printing:`, customerError);
          // Set placeholder customer data for printing
          billData.customer = {
            id: billData.customerId,
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
          };
        }
      }
      
      setBill(billData);
      generateBillPreview(billData);
    } catch (error) {
      console.error('Error loading bill:', error);
      Alert.alert(
        'Error',
        'Failed to load bill details. Please try again.',
        [
          { text: 'Retry', onPress: loadBill },
          { text: 'Go Back', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [billId, navigation]);

  const generateBillPreview = useCallback((billData: Bill) => {
    const shopInfo = BillPrintService.getDefaultShopInfo();
    const printData: BillPrintData = {
      bill: billData,
      shopInfo,
      printDate: new Date().toLocaleString('en-IN'),
    };

    const html = BillPrintService.generateBillHTML(printData, printOptions);
    setHtmlContent(html);
  }, [printOptions]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Print Bill',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <MaterialIcon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={togglePreview}
            style={styles.headerButton}
          >
            <MaterialIcon 
              name={showPreview ? "visibility-off" : "visibility"} 
              size={24} 
              color="#007AFF" 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={shareBill}
            style={styles.headerButton}
          >
            <MaterialIcon name="share" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, showPreview]);

  useEffect(() => {
    loadBill();
  }, [loadBill]);

  useEffect(() => {
    if (bill) {
      generateBillPreview(bill);
    }
  }, [bill, printOptions, generateBillPreview]);

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const updatePrintOption = <K extends keyof PrintOptions>(
    key: K,
    value: PrintOptions[K]
  ) => {
    setPrintOptions(prev => ({ ...prev, [key]: value }));
  };

  const handlePrint = async () => {
    if (!bill) return;

    // Check if RNPrint is available
    if (!RNPrint) {
      Alert.alert(
        'Print Not Available', 
        'Print functionality is not available on this device. You can still share the bill details.',
        [
          { text: 'OK' },
          { text: 'Share Instead', onPress: shareBill }
        ]
      );
      return;
    }

    setIsPrinting(true);
    try {
      const shopInfo = BillPrintService.getDefaultShopInfo();
      const printData: BillPrintData = {
        bill,
        shopInfo,
        printDate: new Date().toLocaleString('en-IN'),
      };

      if (printOptions.format === 'pdf') {
        // Generate PDF and print
        const htmlContent = BillPrintService.generateBillHTML(printData, printOptions);
        
        await RNPrint.print({
          html: htmlContent,
          jobName: `Bill-${bill.billNumber}`,
          isLandscape: false,
        });
        
        Alert.alert('Success', 'Bill has been sent to printer successfully!');
      } else {
        // Print HTML directly
        await RNPrint.print({
          html: htmlContent,
          jobName: `Bill-${bill.billNumber}`,
          isLandscape: false,
        });
        
        Alert.alert('Success', 'Bill has been sent to printer successfully!');
      }
    } catch (error) {
      console.error('Error printing bill:', error);
      
      // Handle specific error cases
      if (error.message?.includes('cancelled')) {
        // User cancelled the print dialog
        return;
      } else if (error.message?.includes('no printer')) {
        Alert.alert('No Printer Found', 'Please make sure a printer is connected and try again.');
      } else {
        Alert.alert('Print Error', 'Failed to print bill. Please check your printer connection and try again.');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const shareAsImage = async () => {
    if (!bill) return;

    // Check if captureRef is available
    if (!captureRef) {
      Alert.alert(
        'Image Sharing Not Available',
        'Image sharing is not available on this device. Would you like to share as text instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share as Text', onPress: shareAsText },
        ]
      );
      return;
    }

    if (!billImageRef.current) {
      Alert.alert('Error', 'Unable to generate bill image. Please try again.');
      console.log('billImageRef.current is null');
      return;
    }

    try {
      console.log('Starting image capture...');
      
      // Add a small delay to ensure the component is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the bill image with better options
      const uri = await captureRef(billImageRef.current, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
        height: undefined, // Let it auto-calculate
        width: 400,
      });

      console.log('Image captured successfully:', uri);

      if (!uri) {
        throw new Error('Failed to generate image - no URI returned');
      }

      await Share.share({
        title: `Bill ${bill.billNumber}`,
        message: `Bill ${bill.billNumber} - ${bill.customer?.personalDetails?.name || 'Customer'}`,
        url: uri,
      });
    } catch (error) {
      console.error('Error sharing bill as image:', error);
      Alert.alert(
        'Image Sharing Failed',
        `Failed to share bill as image: ${error.message}. Would you like to share as text instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share as Text', onPress: shareAsText },
        ]
      );
    }
  };

  const shareBill = async () => {
    if (!bill) return;

    // Debug: Log what modules are available
    console.log('captureRef available:', !!captureRef);
    console.log('RNPrint available:', !!RNPrint);

    // Create all share options explicitly in a simple array
    const allOptions = [
      { text: 'Cancel', style: 'cancel' as const },
      { text: 'Share as Image', onPress: shareAsImage },
      { text: 'Share as Text', onPress: shareAsText },
      { text: 'Share as PDF', onPress: shareAsPDF },
    ];

    console.log('All options:', allOptions.map(o => o.text));

    // Show all options regardless of module availability
    Alert.alert(
      'Share Bill',
      'Choose how you want to share this bill:',
      allOptions,
      { cancelable: true }
    );
  };

  const shareAsText = async () => {
    if (!bill) return;

    const customerName = bill.customer?.personalDetails?.name || 'Customer';

    // Create detailed bill text for sharing
    const billText = `Bill ${bill.billNumber} - ${customerName}

Billing Date: ${new Date(bill.billingDate).toLocaleDateString()}
Delivery Date: ${new Date(bill.deliveryDate).toLocaleDateString()}

Items:
${bill.items.map((item, index) => 
  `${index + 1}. ${item.name} - Qty: ${item.quantity} - ₹${(item.quantity * item.unitPrice).toFixed(2)}`
).join('\n')}

${bill.receivedItems.length > 0 ? `\nReceived Items:
${bill.receivedItems.map((item, index) => 
  `${index + 1}. ${item.name} - Qty: ${item.quantity}`
).join('\n')}` : ''}

Total Amount: ₹${bill.totalAmount.toFixed(2)}
Paid Amount: ₹${bill.paidAmount.toFixed(2)}
Outstanding: ₹${bill.outstandingAmount.toFixed(2)}

${bill.notes ? `\nNotes: ${bill.notes}` : ''}`;

    try {
      await Share.share({
        title: `Bill ${bill.billNumber}`,
        message: billText,
      });
    } catch (error) {
      console.error('Error sharing bill as text:', error);
      Alert.alert('Error', 'Failed to share bill as text. Please try again.');
    }
  };

  const shareAsPDF = async () => {
    if (!bill || !RNPrint) return;

    try {
      const pdfPath = await RNPrint.print({
        html: htmlContent,
        jobName: `Bill-${bill.billNumber}`,
        isLandscape: false,
        printerURL: '', // This will save to file instead of printing
      });

      await Share.share({
        title: `Bill ${bill.billNumber}`,
        message: `Bill ${bill.billNumber} - ${bill.customer?.personalDetails?.name || 'Customer'}`,
        url: pdfPath, // Share the PDF file
      });
    } catch (error) {
      console.error('Error sharing bill as PDF:', error);
      Alert.alert('Error', 'Failed to share bill as PDF. Please try again.');
    }
  };

  const renderPrintOptions = () => (
    <ModernCard style={styles.optionsCard}>
      <Text style={styles.optionsTitle}>Print Options</Text>
      
      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Paper Size:</Text>
        <View style={styles.optionButtons}>
          {(['A4', 'A5', 'thermal'] as const).map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.optionButton,
                printOptions.paperSize === size && styles.optionButtonActive,
              ]}
              onPress={() => updatePrintOption('paperSize', size)}
            >
              <Text style={[
                styles.optionButtonText,
                printOptions.paperSize === size && styles.optionButtonTextActive,
              ]}>
                {size.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Format:</Text>
        <View style={styles.optionButtons}>
          {(['html', 'pdf'] as const).map((format) => (
            <TouchableOpacity
              key={format}
              style={[
                styles.optionButton,
                printOptions.format === format && styles.optionButtonActive,
              ]}
              onPress={() => updatePrintOption('format', format)}
            >
              <Text style={[
                styles.optionButtonText,
                printOptions.format === format && styles.optionButtonTextActive,
              ]}>
                {format.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.checkboxOptions}>
        {[
          { key: 'includeShopLogo', label: 'Include Shop Logo' },
          { key: 'includePaymentHistory', label: 'Include Payment History' },
          { key: 'includeReceivedItems', label: 'Include Received Items' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={styles.checkboxRow}
            onPress={() => updatePrintOption(
              key as keyof PrintOptions, 
              !printOptions[key as keyof PrintOptions]
            )}
          >
            <MaterialIcon
              name={printOptions[key as keyof PrintOptions] ? "check-box" : "check-box-outline-blank"}
              size={20}
              color="#007AFF"
            />
            <Text style={styles.checkboxLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ModernCard>
  );

  const renderBillSummary = () => {
    if (!bill) return null;

    return (
      <ModernCard style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Bill Summary</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(bill.status) }]}>
              {getStatusLabel(bill.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bill Number:</Text>
            <Text style={styles.summaryValue}>{bill.billNumber}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Customer:</Text>
            <Text style={styles.summaryValue}>{bill.customer?.personalDetails?.name || 'Customer information not available'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>₹{bill.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Outstanding:</Text>
            <Text style={[styles.summaryValue, { 
              color: bill.outstandingAmount > 0 ? '#FF3B30' : '#34C759' 
            }]}>
              ₹{bill.outstandingAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_paid': return '#34C759';
      case 'partially_paid': return '#FF9500';
      case 'unpaid': return '#FF3B30';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'fully_paid': return 'Fully Paid';
      case 'partially_paid': return 'Partially Paid';
      case 'unpaid': return 'Unpaid';
      case 'draft': return 'Draft';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const renderBillImage = () => {
    if (!bill) return null;

    const shopInfo = BillPrintService.getDefaultShopInfo();

    return (
      <View style={styles.billImageContainer}>
        {/* Header */}
        <View style={styles.billImageHeader}>
          <Text style={styles.billImageShopName}>{shopInfo.name}</Text>
          <Text style={styles.billImageShopDetails}>{shopInfo.address}</Text>
          <Text style={styles.billImageShopDetails}>Phone: {shopInfo.phone}</Text>
          {shopInfo.email && <Text style={styles.billImageShopDetails}>Email: {shopInfo.email}</Text>}
          {shopInfo.gst && <Text style={styles.billImageShopDetails}>GST: {shopInfo.gst}</Text>}
        </View>

        {/* Bill Info */}
        <View style={styles.billImageInfo}>
          <View style={styles.billImageInfoRow}>
            <View>
              <Text style={styles.billImageBillNumber}>Bill #{bill.billNumber}</Text>
              <Text style={styles.billImageStatus}>Status: {getStatusLabel(bill.status)}</Text>
            </View>
            <View style={styles.billImageDates}>
              <Text style={styles.billImageDate}>Billing: {new Date(bill.billingDate).toLocaleDateString()}</Text>
              <Text style={styles.billImageDate}>Delivery: {new Date(bill.deliveryDate).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.billImageCustomer}>
          <Text style={styles.billImageCustomerName}>
            {bill.customer?.personalDetails?.name || 'Customer information not available'}
          </Text>
          {bill.customer?.personalDetails?.phone && (
            <Text style={styles.billImageCustomerDetails}>Phone: {bill.customer.personalDetails.phone}</Text>
          )}
          {bill.customer?.personalDetails?.email && (
            <Text style={styles.billImageCustomerDetails}>Email: {bill.customer.personalDetails.email}</Text>
          )}
        </View>

        {/* Items */}
        <View style={styles.billImageItems}>
          <Text style={styles.billImageSectionTitle}>Billing Items</Text>
          <View style={styles.billImageItemsHeader}>
            <Text style={styles.billImageItemHeaderText}>#</Text>
            <Text style={[styles.billImageItemHeaderText, { flex: 2 }]}>Item</Text>
            <Text style={styles.billImageItemHeaderText}>Qty</Text>
            <Text style={styles.billImageItemHeaderText}>Rate</Text>
            <Text style={styles.billImageItemHeaderText}>Amount</Text>
          </View>
          {bill.items.map((item, index) => (
            <View key={index} style={styles.billImageItemRow}>
              <Text style={styles.billImageItemText}>{index + 1}</Text>
              <View style={[styles.billImageItemText, { flex: 2 }]}>
                <Text style={styles.billImageItemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.billImageItemDesc}>{item.description}</Text>
                )}
              </View>
              <Text style={styles.billImageItemText}>{item.quantity}</Text>
              <Text style={styles.billImageItemText}>₹{item.unitPrice.toFixed(2)}</Text>
              <Text style={styles.billImageItemText}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Received Items */}
        {bill.receivedItems.length > 0 && (
          <View style={styles.billImageItems}>
            <Text style={styles.billImageSectionTitle}>Received Items</Text>
            {bill.receivedItems.map((item, index) => (
              <View key={index} style={styles.billImageReceivedItem}>
                <Text style={styles.billImageReceivedItemText}>
                  {index + 1}. {item.name} - Qty: {item.quantity}
                </Text>
                <Text style={styles.billImageReceivedItemDate}>
                  Received: {new Date(item.receivedDate).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Total */}
        <View style={styles.billImageTotal}>
          <View style={styles.billImageTotalRow}>
            <Text style={styles.billImageTotalLabel}>Total Amount:</Text>
            <Text style={styles.billImageTotalAmount}>₹{bill.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.billImageTotalRow}>
            <Text style={styles.billImageTotalLabel}>Paid Amount:</Text>
            <Text style={styles.billImageTotalPaid}>₹{bill.paidAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.billImageTotalRow}>
            <Text style={styles.billImageTotalLabel}>Outstanding:</Text>
            <Text style={styles.billImageTotalOutstanding}>₹{bill.outstandingAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {bill.notes && (
          <View style={styles.billImageNotes}>
            <Text style={styles.billImageNotesTitle}>Notes:</Text>
            <Text style={styles.billImageNotesText}>{bill.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.billImageFooter}>
          <Text style={styles.billImageFooterText}>Thank you for choosing {shopInfo.name}!</Text>
          <Text style={styles.billImageFooterText}>Generated on: {new Date().toLocaleString('en-IN')}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading bill details..." />
      </SafeAreaView>
    );
  }

  if (!bill) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcon name="error" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load bill details</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadBill}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {renderBillSummary()}
        {renderPrintOptions()}
        
        {showPreview && (
          <ModernCard style={styles.previewCard}>
            <Text style={styles.previewTitle}>Print Preview</Text>
            <View style={styles.previewContainer}>
              <ScrollView style={styles.previewScrollView}>
                <Text style={styles.previewText}>
                  {bill ? `Bill Preview:\n\nBill Number: ${bill.billNumber}\nCustomer: ${bill.customer?.personalDetails?.name || 'Customer information not available'}\nBilling Date: ${new Date(bill.billingDate).toLocaleDateString()}\nDelivery Date: ${new Date(bill.deliveryDate).toLocaleDateString()}\nTotal Amount: ₹${bill.totalAmount.toFixed(2)}\nOutstanding: ₹${bill.outstandingAmount.toFixed(2)}\n\nItems:\n${bill.items.map((item, index) => `${index + 1}. ${item.name} - Qty: ${item.quantity} - ₹${(item.quantity * item.unitPrice).toFixed(2)}`).join('\n')}\n\n${bill.receivedItems.length > 0 ? `Received Items:\n${bill.receivedItems.map((item, index) => `${index + 1}. ${item.name} - Qty: ${item.quantity}`).join('\n')}` : 'No received items'}` : 'Loading preview...'}
                </Text>
              </ScrollView>
            </View>
          </ModernCard>
        )}
      </ScrollView>

      {/* Hidden Bill Image Component for Capture */}
      <View style={styles.hiddenBillImage} ref={billImageRef}>
        {renderBillImage()}
      </View>

      <View style={styles.footer}>
        <ModernButton
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.cancelButton}
          testID="cancel-print"
        />
        <ModernButton
          title="Print"
          onPress={handlePrint}
          loading={isPrinting}
          style={styles.actionButton}
          testID="print-bill"
        />
        <ModernButton
          title="Share"
          onPress={shareBill}
          style={styles.actionButton}
          testID="share-bill"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  optionsCard: {
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  optionRow: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    backgroundColor: '#FFF',
  },
  optionButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#666',
  },
  optionButtonTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  checkboxOptions: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#000',
  },
  previewCard: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  previewContainer: {
    height: 400,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  webView: {
    flex: 1,
  },
  previewScrollView: {
    flex: 1,
    padding: 16,
  },
  previewText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  printButton: {
    flex: 2,
  },
  actionButton: {
    flex: 1,
  },
  // Hidden bill image styles for capture
  hiddenBillImage: {
    position: 'absolute',
    left: -500, // Move it off-screen to the left
    top: 0,
    width: 400,
    backgroundColor: '#FFF',
    opacity: 1, // Keep it fully visible for capture
    zIndex: 1000, // Bring it to front for capture
    pointerEvents: 'none', // Don't interfere with touch events
    overflow: 'visible', // Allow content to be visible for capture
  },
  billImageContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    width: 400,
  },
  billImageHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 15,
    marginBottom: 20,
  },
  billImageShopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
    textAlign: 'center',
  },
  billImageShopDetails: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  billImageInfo: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  billImageInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billImageBillNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  billImageStatus: {
    fontSize: 12,
    color: '#666',
  },
  billImageDates: {
    alignItems: 'flex-end',
  },
  billImageDate: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  billImageCustomer: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#fafafa',
  },
  billImageCustomerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  billImageCustomerDetails: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  billImageItems: {
    marginBottom: 20,
  },
  billImageSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  billImageItemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  billImageItemHeaderText: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  billImageItemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  billImageItemText: {
    flex: 1,
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
  },
  billImageItemName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#000',
  },
  billImageItemDesc: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
  },
  billImageReceivedItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  billImageReceivedItemText: {
    fontSize: 10,
    color: '#333',
    marginBottom: 2,
  },
  billImageReceivedItemDate: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
  },
  billImageTotal: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 2,
    borderColor: '#2c3e50',
    borderRadius: 5,
    backgroundColor: '#f8f9fa',
  },
  billImageTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  billImageTotalLabel: {
    fontSize: 13,
    color: '#333',
  },
  billImageTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  billImageTotalPaid: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  billImageTotalOutstanding: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  billImageNotes: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9500',
  },
  billImageNotesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 5,
  },
  billImageNotesText: {
    fontSize: 11,
    color: '#bf360c',
    lineHeight: 16,
  },
  billImageFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 15,
  },
  billImageFooterText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
});