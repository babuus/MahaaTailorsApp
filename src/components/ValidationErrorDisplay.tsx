import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, HelperText, Card } from 'react-native-paper';
import { FormValidationState } from '../types';

interface ValidationErrorDisplayProps {
  errors: Record<string, string>;
  touched?: Record<string, boolean>;
  showAllErrors?: boolean;
  style?: any;
}

const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  touched = {},
  showAllErrors = false,
  style,
}) => {
  const visibleErrors = Object.entries(errors).filter(([field, error]) => {
    return error && (showAllErrors || touched[field]);
  });

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {visibleErrors.map(([field, error]) => (
        <HelperText
          key={field}
          type="error"
          visible={true}
          style={styles.errorText}
        >
          {error}
        </HelperText>
      ))}
    </View>
  );
};

// Field-specific validation error component
interface FieldValidationErrorProps {
  error?: string;
  touched?: boolean;
  visible?: boolean;
  style?: any;
}

export const FieldValidationError: React.FC<FieldValidationErrorProps> = ({
  error,
  touched = false,
  visible = true,
  style,
}) => {
  const shouldShow = visible && error && touched;

  return (
    <HelperText
      type="error"
      visible={shouldShow}
      style={[styles.fieldError, style]}
    >
      {error || ' '}
    </HelperText>
  );
};

// Form summary validation errors
interface FormValidationSummaryProps {
  validationState: FormValidationState;
  title?: string;
  style?: any;
}

export const FormValidationSummary: React.FC<FormValidationSummaryProps> = ({
  validationState,
  title = 'Please fix the following errors:',
  style,
}) => {
  const { errors, touched } = validationState;
  
  const visibleErrors = Object.entries(errors).filter(([field, error]) => {
    return error && touched[field];
  });

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <Card style={[styles.summaryCard, style]}>
      <Card.Content>
        <Text style={styles.summaryTitle}>{title}</Text>
        {visibleErrors.map(([field, error]) => (
          <View key={field} style={styles.summaryItem}>
            <Text style={styles.summaryBullet}>•</Text>
            <Text style={styles.summaryError}>{error}</Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
};

// Inline validation status indicator
interface ValidationStatusProps {
  isValid: boolean;
  hasErrors: boolean;
  isValidating?: boolean;
  style?: any;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  isValid,
  hasErrors,
  isValidating = false,
  style,
}) => {
  if (isValidating) {
    return (
      <View style={[styles.statusContainer, style]}>
        <Text style={styles.validatingText}>Validating...</Text>
      </View>
    );
  }

  if (hasErrors) {
    return (
      <View style={[styles.statusContainer, style]}>
        <Text style={styles.errorStatus}>❌ Please fix errors above</Text>
      </View>
    );
  }

  if (isValid) {
    return (
      <View style={[styles.statusContainer, style]}>
        <Text style={styles.validStatus}>✅ All fields are valid</Text>
      </View>
    );
  }

  return null;
};

// Server validation error display
interface ServerValidationErrorProps {
  errors: Record<string, string[]>;
  title?: string;
  style?: any;
}

export const ServerValidationError: React.FC<ServerValidationErrorProps> = ({
  errors,
  title = 'Server validation errors:',
  style,
}) => {
  const errorEntries = Object.entries(errors).filter(([_, fieldErrors]) => 
    fieldErrors && fieldErrors.length > 0
  );

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <Card style={[styles.serverErrorCard, style]}>
      <Card.Content>
        <Text style={styles.serverErrorTitle}>{title}</Text>
        {errorEntries.map(([field, fieldErrors]) => (
          <View key={field} style={styles.serverErrorField}>
            <Text style={styles.serverErrorFieldName}>
              {field.charAt(0).toUpperCase() + field.slice(1)}:
            </Text>
            {fieldErrors.map((error, index) => (
              <Text key={index} style={styles.serverErrorMessage}>
                • {error}
              </Text>
            ))}
          </View>
        ))}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  errorText: {
    fontSize: 12,
    marginVertical: 2,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  summaryCard: {
    marginVertical: 8,
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  summaryBullet: {
    color: '#f44336',
    marginRight: 8,
    fontSize: 14,
  },
  summaryError: {
    flex: 1,
    fontSize: 14,
    color: '#d32f2f',
  },
  statusContainer: {
    padding: 8,
    marginVertical: 4,
  },
  validatingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  errorStatus: {
    fontSize: 12,
    color: '#f44336',
  },
  validStatus: {
    fontSize: 12,
    color: '#4caf50',
  },
  serverErrorCard: {
    marginVertical: 8,
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  serverErrorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  serverErrorField: {
    marginBottom: 8,
  },
  serverErrorFieldName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#bf360c',
    marginBottom: 2,
  },
  serverErrorMessage: {
    fontSize: 12,
    color: '#e65100',
    marginLeft: 8,
  },
});

export default ValidationErrorDisplay;