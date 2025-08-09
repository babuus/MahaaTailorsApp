import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useThemeContext } from '../contexts/ThemeContext';
import { COLORS, SPACING } from '../constants';
import { MeasurementConfig } from '../types';

interface MeasurementConfigListItemProps {
  item: MeasurementConfig;
  onPress?: (item: MeasurementConfig) => void;
  testID?: string;
}

const MeasurementConfigListItem: React.FC<MeasurementConfigListItemProps> = ({
  item,
  onPress,
  testID,
}) => {
  const { isDarkMode } = useThemeContext();

  const containerStyle = {
    backgroundColor: isDarkMode ? '#333' : '#fff',
    borderColor: isDarkMode ? '#444' : '#e0e0e0',
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const subtitleStyle = {
    color: isDarkMode ? '#aaa' : '#666',
  };

  return (
    <TouchableOpacity
      style={[styles.container, containerStyle]}
      onPress={() => onPress?.(item)}
      accessibilityLabel={`${item.garmentType} template with ${item.measurements.length} fields`}
      accessibilityHint="Tap to view details"
      testID={testID}
    >
      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <Text style={[styles.garmentType, textStyle]} numberOfLines={1}>
            {item.garmentType}
          </Text>
          <Text style={[styles.fieldCount, subtitleStyle]}>
            {item.measurements.length} field{item.measurements.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {item.measurements.length > 0 && (
        <View style={styles.measurementPreview}>
          <Text style={[styles.measurementPreviewText, subtitleStyle]} numberOfLines={2}>
            Fields: {item.measurements.slice(0, 3).join(', ')}
            {item.measurements.length > 3 ? '...' : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.MD,
    marginVertical: SPACING.XS,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  mainInfo: {
    flex: 1,
  },
  garmentType: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  fieldCount: {
    fontSize: 14,
    fontWeight: '400',
  },

  measurementPreview: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
    paddingTop: 0,
  },
  measurementPreviewText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default MeasurementConfigListItem;