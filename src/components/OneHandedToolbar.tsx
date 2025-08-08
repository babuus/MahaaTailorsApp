import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcon } from './';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';

interface OneHandedToolbarProps {
  onSearch?: () => void;
  onAdd?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  showSearch?: boolean;
  showAdd?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  style?: any;
}

const OneHandedToolbar: React.FC<OneHandedToolbarProps> = ({
  onSearch,
  onAdd,
  onFilter,
  onSort,
  showSearch = true,
  showAdd = true,
  showFilter = false,
  showSort = false,
  style,
}) => {
  const { isDarkMode } = useThemeContext();
  const screenWidth = Dimensions.get('window').width;
  
  // Position toolbar in thumb-friendly zone (bottom 1/3 of screen)
  const toolbarStyle = {
    backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
    borderTopColor: isDarkMode ? '#555555' : '#E0E0E0',
  };

  return (
    <View style={[styles.container, toolbarStyle, style]}>
      <View style={styles.toolbar}>
        {showSearch && (
          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: COLORS.PRIMARY }]}
            onPress={onSearch}
            accessibilityLabel="Search customers"
            accessibilityHint="Open search interface"
          >
            <MaterialIcon name="search" size="md" color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {showAdd && (
          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: COLORS.SUCCESS }]}
            onPress={onAdd}
            accessibilityLabel="Add customer"
            accessibilityHint="Create new customer"
          >
            <MaterialIcon name="add" size="md" color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {showFilter && (
          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: COLORS.SECONDARY }]}
            onPress={onFilter}
            accessibilityLabel="Filter customers"
            accessibilityHint="Filter customer list"
          >
            <MaterialIcon name="filter" size="md" color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {showSort && (
          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: COLORS.INFO }]}
            onPress={onSort}
            accessibilityLabel="Sort customers"
            accessibilityHint="Sort customer list"
          >
            <MaterialIcon name="sort" size="md" color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingBottom: SPACING.MD,
    paddingTop: SPACING.SM,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
  },
  toolbarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default OneHandedToolbar;