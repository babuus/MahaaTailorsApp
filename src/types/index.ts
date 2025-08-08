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
  entity: 'customer' | 'measurementConfig';
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

export type RootStackParamList = RootDrawerParamList & CustomerStackParamList & MeasurementConfigStackParamList;

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
} from './validation';

// ============================================================================
// RE-EXPORT VALIDATION CONSTANTS AND SCHEMAS
// ============================================================================

export {
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  CUSTOMER_VALIDATION_SCHEMA,
  MEASUREMENT_CONFIG_VALIDATION_SCHEMA,
} from './validation';