// Core data types for the Mahaa Tailors mobile app

// ============================================================================
// CUSTOMER DATA MODELS
// ============================================================================

export interface Customer {
  id: string;
  personalDetails: CustomerPersonalDetails;
  measurements: CustomerMeasurement[];
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPersonalDetails {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dob?: string;
}

export interface CustomerMeasurement {
  id?: string;
  garmentType: string;
  fields: MeasurementField[];
  notes?: string;
  lastMeasuredDate: string;
}

export interface MeasurementField {
  name: string;
  value: string;
}

// Customer form data for create/update operations
export interface CustomerFormData {
  personalDetails: CustomerPersonalDetails;
  measurements?: CustomerMeasurement[];
  comments?: string;
}

// Customer creation request (without id and timestamps)
export interface CreateCustomerRequest {
  personalDetails: CustomerPersonalDetails;
  measurements?: Omit<CustomerMeasurement, 'id' | 'lastMeasuredDate'>[];
  comments?: string;
}

// Customer update request
export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: string;
}

// ============================================================================
// MEASUREMENT CONFIGURATION DATA MODELS
// ============================================================================

export interface MeasurementConfig {
  id: string;
  garmentType: string;
  measurements: string[];
  createdAt: string;
  updatedAt: string;
}

// Measurement config form data
export interface MeasurementConfigFormData {
  garmentType: string;
  measurements: string[];
}

// Measurement config creation request
export interface CreateMeasurementConfigRequest {
  garmentType: string;
  measurements: string[];
}

// Measurement config update request
export interface UpdateMeasurementConfigRequest extends CreateMeasurementConfigRequest {
  id: string;
}

// ============================================================================
// BILLING DATA MODELS
// ============================================================================

export interface Bill {
  id: string;
  customerId: string;
  customer?: Customer; // Populated when needed
  billNumber: string;
  billingDate: string;
  deliveryDate: string;
  items: BillItem[];
  receivedItems: ReceivedItem[];
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: BillStatus;
  deliveryStatus: DeliveryStatus;
  payments: Payment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  id: string;
  type: 'configured' | 'custom';
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  configItemId?: string; // Reference to billing config item
  materialSource?: 'customer' | 'business'; // Who provides the materials
  deliveryStatus?: DeliveryStatus; // Individual item delivery status
  statusChangeDate?: string; // Date when status was last changed
}

export interface ReceivedItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  receivedDate: string;
  returnedDate?: string;
  status: 'received' | 'returned';
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  notes?: string;
  createdAt: string;
}

export type BillStatus = 'draft' | 'unpaid' | 'partially_paid' | 'fully_paid' | 'cancelled';
export type DeliveryStatus = 'pending' | 'in_progress' | 'ready_for_delivery' | 'delivered' | 'cancelled';

export interface BillingConfigItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: 'service' | 'material' | 'alteration';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivedItemTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'sample' | 'material' | 'accessory' | 'other';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Bill form data for create/update operations
export interface BillFormData {
  customerId: string;
  billingDate: string;
  deliveryDate: string;
  deliveryStatus?: DeliveryStatus;
  items: Omit<BillItem, 'id' | 'totalPrice'>[];
  receivedItems: Omit<ReceivedItem, 'id'>[];
  notes?: string;
}

// Bill creation request
export interface CreateBillRequest {
  customerId: string;
  billingDate: string;
  deliveryDate: string;
  deliveryStatus?: DeliveryStatus;
  items: Omit<BillItem, 'id' | 'totalPrice'>[];
  receivedItems: Omit<ReceivedItem, 'id'>[];
  payments?: Omit<Payment, 'id' | 'createdAt'>[];
  notes?: string;
}

// Bill update request
export interface UpdateBillRequest extends Partial<CreateBillRequest> {
  id: string;
}

// Payment creation request
export interface CreatePaymentRequest {
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  notes?: string;
}

// Payment update request
export interface UpdatePaymentRequest extends CreatePaymentRequest {
  id: string;
}

// Billing config item form data
export interface BillingConfigItemFormData {
  name: string;
  description?: string;
  price: number;
  category: 'service' | 'material' | 'alteration';
}

// Billing config item creation request
export interface CreateBillingConfigItemRequest {
  name: string;
  description?: string;
  price: number;
  category: 'service' | 'material' | 'alteration';
}

// Billing config item update request
export interface UpdateBillingConfigItemRequest extends CreateBillingConfigItemRequest {
  id: string;
}

// Received item template form data
export interface ReceivedItemTemplateFormData {
  name: string;
  description?: string;
  category: 'sample' | 'material' | 'accessory' | 'other';
}

// Received item template creation request
export interface CreateReceivedItemTemplateRequest {
  name: string;
  description?: string;
  category: 'sample' | 'material' | 'accessory' | 'other';
}

// Received item template update request
export interface UpdateReceivedItemTemplateRequest extends CreateReceivedItemTemplateRequest {
  id: string;
}

// Bill query parameters
export interface BillQueryParams {
  customerId?: string;
  status?: BillStatus;
  startDate?: string;
  endDate?: string;
  searchText?: string;
  limit?: number;
  startAfter?: string;
}

// Calendar event for billing integration
export interface CalendarEvent {
  id: string;
  type: 'billing' | 'delivery';
  date: string;
  billId: string;
  billNumber: string;
  customerName: string;
  amount?: number;
  status?: BillStatus;
}

// ============================================================================
// API RESPONSE WRAPPER INTERFACES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageCursor?: string;
  hasMore: boolean;
  total?: number;
}

// Specific API response types
export interface CustomerListResponse extends ApiResponse<PaginatedResponse<Customer>> {}
export interface CustomerResponse extends ApiResponse<Customer> {}
export interface MeasurementConfigListResponse extends ApiResponse<PaginatedResponse<MeasurementConfig>> {}
export interface MeasurementConfigResponse extends ApiResponse<MeasurementConfig> {}
export interface BillListResponse extends ApiResponse<PaginatedResponse<Bill>> {}
export interface BillResponse extends ApiResponse<Bill> {}
export interface BillingConfigItemListResponse extends ApiResponse<BillingConfigItem[]> {}
export interface BillingConfigItemResponse extends ApiResponse<BillingConfigItem> {}
export interface ReceivedItemTemplateListResponse extends ApiResponse<ReceivedItemTemplate[]> {}
export interface ReceivedItemTemplateResponse extends ApiResponse<ReceivedItemTemplate> {}
export interface PaymentResponse extends ApiResponse<Payment> {}

// API error response
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: Record<string, string[]>; // Field-specific validation errors
}

// Check customer exists response
export interface CheckCustomerExistsResponse extends ApiResponse<{
  exists: boolean;
  customer?: Customer;
}> {}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorType: 'network' | 'validation' | 'api' | 'unknown';
  retryAction?: () => void;
}

// Form validation state
export interface FormValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

// ============================================================================
// FORM STATE TYPES
// ============================================================================

export interface CustomerFormState {
  data: CustomerFormData;
  validation: FormValidationState;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface MeasurementConfigFormState {
  data: MeasurementConfigFormData;
  validation: FormValidationState;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface BillFormState {
  data: BillFormData;
  validation: FormValidationState;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface BillingConfigItemFormState {
  data: BillingConfigItemFormData;
  validation: FormValidationState;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface ReceivedItemTemplateFormState {
  data: ReceivedItemTemplateFormData;
  validation: FormValidationState;
  isSubmitting: boolean;
  isDirty: boolean;
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

export interface SearchState {
  query: string;
  isSearching: boolean;
  results: any[];
}

export interface CustomerSearchFilters {
  query?: string;
  sortBy?: 'name' | 'phone' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface MeasurementConfigSearchFilters {
  query?: string;
  sortBy?: 'garmentType' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// LOADING AND ASYNC STATE TYPES
// ============================================================================

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetched?: Date;
}

export interface ListState<T> extends AsyncState<T[]> {
  hasMore: boolean;
  nextPageCursor?: string;
  refreshing: boolean;
}

// ============================================================================
// CACHE AND OFFLINE TYPES
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt?: Date;
}

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'customer' | 'measurementConfig' | 'bill' | 'billingConfigItem' | 'receivedItemTemplate';
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BaseComponentProps {
  testID?: string;
  style?: any;
}

export interface ListItemProps<T> extends BaseComponentProps {
  item: T;
  onPress?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export interface FormFieldProps extends BaseComponentProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export type RootDrawerParamList = {
  Dashboard: undefined;
  CustomerManagement: undefined;
  MeasurementConfig: undefined;
  Billing: undefined;
  BillingConfig: undefined;
  Calendar: undefined;
  Settings: undefined;
};

export type CustomerStackParamList = {
  CustomerList: undefined;
  CustomerDetail: { customer: Customer };
  CustomerForm: { customer?: Customer; mode: 'add' | 'edit' };
};

export type MeasurementConfigStackParamList = {
  MeasurementConfigList: undefined;
  MeasurementConfigForm: { config?: MeasurementConfig; mode: 'add' | 'edit' };
};

export type BillingStackParamList = {
  BillingList: undefined;
  BillingForm: { bill?: Bill; mode: 'add' | 'edit'; customerId?: string };
  BillDetail: { billId: string; bill?: Bill };
  BillPrint: { billId: string };
  ItemsManagement: { billId: string; bill?: Bill };
};

export type BillingConfigStackParamList = {
  BillingConfigList: undefined;
  BillingConfigItemForm: { item?: BillingConfigItem; mode: 'add' | 'edit' };
  ReceivedItemTemplateForm: { template?: ReceivedItemTemplate; mode: 'add' | 'edit' };
};

export type RootStackParamList = RootDrawerParamList & CustomerStackParamList & MeasurementConfigStackParamList & BillingStackParamList & BillingConfigStackParamList;

// ============================================================================
// LOGO COMPONENT TYPES
// ============================================================================

export type LogoVariant = 'full' | 'compact' | 'icon';
export type LogoSize = 'small' | 'medium' | 'large';

export interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  animated?: boolean;
  style?: any;
  context?: 'header' | 'content' | 'sidebar';
}

// ============================================================================
// RE-EXPORT VALIDATION TYPES
// ============================================================================

export type {
  ValidationResult,
  ValidationError,
  FieldValidationResult,
  CustomerValidationSchema,
  FieldValidationRule,
  MeasurementValidationRule,
  MeasurementConfigValidationSchema,
  BillValidationSchema,
  BillItemValidationRule,
  ReceivedItemValidationRule,
  PaymentValidationSchema,
  BillingConfigItemValidationSchema,
  ReceivedItemTemplateValidationSchema,
} from './validation';

// ============================================================================
// RE-EXPORT VALIDATION CONSTANTS AND SCHEMAS
// ============================================================================

export {
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  CUSTOMER_VALIDATION_SCHEMA,
  MEASUREMENT_CONFIG_VALIDATION_SCHEMA,
  BILL_VALIDATION_SCHEMA,
  PAYMENT_VALIDATION_SCHEMA,
  BILLING_CONFIG_ITEM_VALIDATION_SCHEMA,
  RECEIVED_ITEM_TEMPLATE_VALIDATION_SCHEMA,
} from './validation';