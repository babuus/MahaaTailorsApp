import { useEffect, useRef, useState } from 'react';
import { 
  Keyboard, 
  KeyboardEvent, 
  TextInput, 
  Platform,
  Dimensions,
} from 'react-native';

// Keyboard visibility hook
export const useKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
  };
};

// Form field navigation hook
export const useFormNavigation = (fieldCount: number) => {
  const inputRefs = useRef<(TextInput | null)[]>(new Array(fieldCount).fill(null));
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

  const setInputRef = (index: number) => (ref: TextInput | null) => {
    inputRefs.current[index] = ref;
  };

  const focusField = (index: number) => {
    if (index >= 0 && index < fieldCount && inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
      setCurrentFieldIndex(index);
    }
  };

  const focusNextField = () => {
    const nextIndex = currentFieldIndex + 1;
    if (nextIndex < fieldCount) {
      focusField(nextIndex);
    } else {
      // Dismiss keyboard when reaching the last field
      Keyboard.dismiss();
    }
  };

  const focusPreviousField = () => {
    const prevIndex = currentFieldIndex - 1;
    if (prevIndex >= 0) {
      focusField(prevIndex);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return {
    inputRefs: inputRefs.current,
    setInputRef,
    focusField,
    focusNextField,
    focusPreviousField,
    dismissKeyboard,
    currentFieldIndex,
  };
};

// Keyboard avoiding behavior utilities
export const getKeyboardAvoidingViewBehavior = () => {
  return Platform.OS === 'ios' ? 'padding' : 'height';
};

export const getKeyboardVerticalOffset = () => {
  return Platform.OS === 'ios' ? 64 : 0;
};

// Auto-scroll to focused input
export const useAutoScrollToInput = () => {
  const scrollViewRef = useRef<any>(null);

  const scrollToInput = (inputRef: TextInput) => {
    if (scrollViewRef.current && inputRef) {
      inputRef.measureInWindow((x, y, width, height) => {
        const screenHeight = Dimensions.get('window').height;
        const keyboardHeight = 300; // Approximate keyboard height
        const visibleScreenHeight = screenHeight - keyboardHeight;
        
        if (y + height > visibleScreenHeight) {
          const scrollOffset = y + height - visibleScreenHeight + 50; // 50px padding
          scrollViewRef.current.scrollTo({
            y: scrollOffset,
            animated: true,
          });
        }
      });
    }
  };

  return {
    scrollViewRef,
    scrollToInput,
  };
};

// Keyboard toolbar for iOS
export const KeyboardToolbar = {
  show: (onDone?: () => void, onPrevious?: () => void, onNext?: () => void) => {
    // This would typically integrate with a keyboard toolbar library
    // For now, we'll handle it through return key types and form navigation
  },
  hide: () => {
    Keyboard.dismiss();
  },
};

// Form submission prevention during keyboard operations
export const useKeyboardSubmissionPrevention = () => {
  const [isKeyboardOperation, setIsKeyboardOperation] = useState(false);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardOperation(true);
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Add a small delay to prevent accidental submissions
      setTimeout(() => {
        setIsKeyboardOperation(false);
      }, 100);
    });

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, []);

  return isKeyboardOperation;
};

// Input focus management utilities
export const InputFocusManager = {
  // Focus the first invalid field
  focusFirstInvalidField: (
    inputRefs: (TextInput | null)[],
    errors: Record<string, string>,
    fieldNames: string[]
  ) => {
    for (let i = 0; i < fieldNames.length; i++) {
      if (errors[fieldNames[i]] && inputRefs[i]) {
        inputRefs[i]?.focus();
        break;
      }
    }
  },

  // Focus field by name
  focusFieldByName: (
    inputRefs: (TextInput | null)[],
    fieldNames: string[],
    targetFieldName: string
  ) => {
    const index = fieldNames.indexOf(targetFieldName);
    if (index !== -1 && inputRefs[index]) {
      inputRefs[index]?.focus();
    }
  },

  // Blur all fields
  blurAllFields: (inputRefs: (TextInput | null)[]) => {
    inputRefs.forEach(ref => {
      ref?.blur();
    });
  },
};

// Return key type utilities
export const getReturnKeyType = (isLastField: boolean, hasNextField: boolean) => {
  if (isLastField) {
    return 'done';
  }
  if (hasNextField) {
    return 'next';
  }
  return 'done';
};

// Keyboard type utilities
export const getKeyboardType = (fieldType: string) => {
  switch (fieldType) {
    case 'email':
      return 'email-address';
    case 'phone':
      return 'phone-pad';
    case 'number':
    case 'numeric':
      return 'numeric';
    case 'decimal':
      return 'decimal-pad';
    case 'url':
      return 'url';
    default:
      return 'default';
  }
};

export default {
  useKeyboard,
  useFormNavigation,
  useAutoScrollToInput,
  useKeyboardSubmissionPrevention,
  getKeyboardAvoidingViewBehavior,
  getKeyboardVerticalOffset,
  InputFocusManager,
  getReturnKeyType,
  getKeyboardType,
  KeyboardToolbar,
};