import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useThemeContext } from '../contexts/ThemeContext';
import { COLORS, SPACING } from '../constants';
import { useAccessibility } from '../utils/accessibility';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  style?: any;
  testID?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  style,
  testID,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isDarkMode } = useThemeContext();
  const { 
    generateButtonHint, 
    ensureMinimumTouchTarget,
    announceForAccessibility 
  } = useAccessibility();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, debounceMs),
    [onSearch, debounceMs]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleChangeText = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  const containerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
    borderColor: isDarkMode ? '#444' : '#ddd',
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.searchContainer, containerStyle]}>
        <Icon name="search" size={18} color={isDarkMode ? '#888' : '#666'} />
        <TextInput
          style={[styles.textInput, textStyle]}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={searchQuery}
          onChangeText={handleChangeText}
          accessibilityLabel="Search input"
          accessibilityHint={`Search with placeholder: ${placeholder}`}
          accessibilityRole="search"
          testID={testID}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={handleClearSearch} 
            style={[styles.clearButton, { minWidth: ensureMinimumTouchTarget(24), minHeight: ensureMinimumTouchTarget(24) }]}
            accessibilityLabel="Clear search"
            accessibilityHint={generateButtonHint('clear search text')}
            accessibilityRole="button"
            testID="clear-button"
          >
            <Icon name="clear" size={18} color={isDarkMode ? '#888' : '#666'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingVertical: SPACING.XS, // Added vertical padding to container
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24, // Increased from 8 to 24 for more rounded sides
    paddingHorizontal: SPACING.MD, // Increased horizontal padding for better proportion
    paddingVertical: SPACING.SM, // Increased vertical padding inside search container
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: SPACING.SM,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: SPACING.XS,
  },
  clearButton: {
    padding: SPACING.XS,
  },
  clearIcon: {
    fontSize: 16,
  },
});

export default SearchBar;