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
    backgroundColor: isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT,
    borderColor: isDarkMode ? COLORS.BORDER_DARK : COLORS.BORDER_LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY,
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
    marginBottom: SPACING.MD,
    paddingVertical: SPACING.XS,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0, // Remove border for cleaner look
    borderRadius: 28, // More rounded for modern pill shape
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: SPACING.SM,
    opacity: 0.6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: SPACING.XS,
    fontWeight: '400',
  },
  clearButton: {
    padding: SPACING.SM,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  clearIcon: {
    fontSize: 16,
  },
});

export default SearchBar;