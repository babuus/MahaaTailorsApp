import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TextInput as RNTextInput } from 'react-native';
import { TextInput, HelperText, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../constants';
import { useAccessibility } from '../utils/accessibility';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  success?: boolean;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  disabled?: boolean;
  maxLength?: number;
  style?: any;
  testID?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'search' | 'send' | 'go';
  blurOnSubmit?: boolean;
  showCharacterCount?: boolean;
  helperText?: string;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  validator?: (value: string) => string | undefined;
}

interface FormInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  isFocused: () => boolean;
}

const FormInput = React.forwardRef<FormInputRef, FormInputProps>((props, ref) => {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    success = false,
    required = false,
    multiline = false,
    numberOfLines = 1,
    keyboardType = 'default',
    secureTextEntry = false,
    disabled = false,
    maxLength,
    style,
    testID,
    autoFocus = false,
    onFocus,
    onBlur,
    onSubmitEditing,
    returnKeyType = 'done',
    blurOnSubmit,
    showCharacterCount = false,
    helperText,
    validateOnBlur = false,
    validateOnChange = false,
    validator,
  } = props;
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();
  const inputRef = useRef<RNTextInput>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Accessibility utilities
  const {
    generateInputLabel,
    announceForAccessibility,
    getAccessibleFontSize
  } = useAccessibility();

  const displayLabel = required ? `${label} *` : label;
  const hasError = Boolean(error || localError);
  const hasSuccess = success && !hasError && value.length > 0;
  const characterCount = value.length;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  // Shake animation for errors
  const shakeInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Trigger shake animation when error appears
  useEffect(() => {
    if (hasError) {
      shakeInput();
    }
  }, [hasError]);

  // Validation logic
  const validateInput = (inputValue: string) => {
    if (validator) {
      const validationError = validator(inputValue);
      setLocalError(validationError);
      return validationError;
    }
    return undefined;
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (validateOnBlur) {
      validateInput(value);
    }
    onBlur?.();
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);

    // Clear local error when user starts typing
    if (localError) {
      setLocalError(undefined);
    }

    // Validate on change if enabled
    if (validateOnChange) {
      validateInput(text);
    }
  };

  const handleSubmitEditing = () => {
    if (validateOnBlur) {
      validateInput(value);
    }
    onSubmitEditing?.();
  };

  // Focus method for external access
  const focus = () => {
    inputRef.current?.focus();
  };

  // Expose focus method through the forwarded ref
  React.useImperativeHandle(ref, () => ({
    focus,
    blur: () => inputRef.current?.blur(),
    clear: () => inputRef.current?.clear(),
    isFocused: () => inputRef.current?.isFocused() || false,
  }));

  const getInputStyle = () => {
    if (hasError) {
      return {
        borderColor: COLORS.ERROR,
        borderWidth: 2,
        backgroundColor: 'rgba(244, 67, 54, 0.05)' // Light red background for errors
      };
    }
    if (hasSuccess) {
      return {
        borderColor: COLORS.SUCCESS || '#4CAF50',
        borderWidth: 2,
        backgroundColor: 'rgba(76, 175, 80, 0.05)' // Light green background for success
      };
    }
    if (isFocused) {
      return {
        borderColor: COLORS.PRIMARY,
        borderWidth: 2,
        backgroundColor: 'rgba(33, 150, 243, 0.05)' // Light blue background when focused
      };
    }
    return {
      borderColor: '#E0E0E0',
      borderWidth: 1,
      backgroundColor: 'transparent'
    };
  };

  const getRightIcon = () => {
    if (hasError) {
      return <Icon name="error" size={20} color={COLORS.ERROR} />;
    }
    if (hasSuccess) {
      return <Icon name="check-circle" size={20} color={COLORS.SUCCESS || '#4CAF50'} />;
    }
    return null;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        { transform: [{ translateX: shakeAnimation }] }
      ]}
    >
      <TextInput
        ref={inputRef}
        label={displayLabel}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        mode="flat"
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        disabled={disabled}
        maxLength={maxLength}
        error={hasError}
        autoFocus={autoFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType={returnKeyType}
        blurOnSubmit={blurOnSubmit ?? (returnKeyType === 'done')}
        accessibilityLabel={generateInputLabel(displayLabel, required, error || localError)}
        accessibilityHint={placeholder || `Enter ${label.toLowerCase()}`}
        accessibilityState={{
          disabled,
          selected: isFocused,
          invalid: hasError,
        }}
        accessibilityRole="text"
        testID={testID}
        style={[styles.input, getInputStyle()]}
        right={getRightIcon() ? <TextInput.Icon icon={() => getRightIcon()} /> : undefined}
        theme={{
          colors: {
            primary: hasError ? COLORS.ERROR : COLORS.PRIMARY,
            error: COLORS.ERROR,
          },
        }}
      />

      {/* Error message */}
      {hasError && (
        <HelperText
          type="error"
          visible={hasError}
          accessibilityLabel={`Error: ${error || localError}`}
          style={styles.errorText}
        >
          <Icon name="error" size={16} color={COLORS.ERROR} style={styles.errorIcon} />
          {error || localError}
        </HelperText>
      )}

      {/* Success message */}
      {hasSuccess && (
        <HelperText
          type="info"
          visible={hasSuccess}
          style={[styles.helperText, { color: COLORS.SUCCESS || '#4CAF50' }]}
        >
          <Icon name="check-circle" size={16} color={COLORS.SUCCESS || '#4CAF50'} style={styles.successIcon} />
          Valid
        </HelperText>
      )}

      {/* Helper text */}
      {!hasError && !hasSuccess && helperText && (
        <HelperText
          type="info"
          visible={true}
          style={styles.helperText}
        >
          {helperText}
        </HelperText>
      )}

      {/* Character count */}
      {showCharacterCount && maxLength && (
        <View style={styles.characterCountContainer}>
          <Text
            style={[
              styles.characterCount,
              isOverLimit && styles.characterCountError
            ]}
          >
            {characterCount}/{maxLength}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorIcon: {
    marginRight: 4,
  },
  helperText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  successIcon: {
    marginRight: 4,
  },
  characterCountContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#666666',
  },
  characterCountError: {
    color: COLORS.ERROR,
  },
});

export default FormInput;