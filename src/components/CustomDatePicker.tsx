import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';

interface CustomDatePickerProps {
  visible: boolean;
  value?: Date;
  onDateChange: (date: Date) => void;
  onCancel: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  visible,
  value,
  onDateChange,
  onCancel,
  maximumDate,
  minimumDate,
}) => {
  const { isDarkMode } = useThemeContext();
  const currentDate = value && value instanceof Date ? value : new Date();
  
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  const overlayStyle = {
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
  };

  const containerStyle = {
    backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const subtextStyle = {
    color: isDarkMode ? '#B0B0B0' : '#666666',
  };

  // Generate years (from 1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse();

  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Generate days for selected month/year
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if date is valid based on min/max constraints
  const isDateValid = useCallback((year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    
    if (maximumDate && date > maximumDate) return false;
    if (minimumDate && date < minimumDate) return false;
    
    return true;
  }, [maximumDate, minimumDate]);

  const handleConfirm = () => {
    if (isDateValid(selectedYear, selectedMonth, selectedDay)) {
      const newDate = new Date(selectedYear, selectedMonth, selectedDay);
      onDateChange(newDate);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth());
    setSelectedDay(currentDate.getDate());
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={[styles.overlay, overlayStyle]}>
        <View style={[styles.container, containerStyle]}>
          <View style={styles.header}>
            <Text style={[styles.title, textStyle]}>Select Date</Text>
          </View>

          <View style={styles.pickerContainer}>
            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <Text style={[styles.columnTitle, textStyle]}>Year</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerItem,
                      selectedYear === year && styles.selectedItem,
                    ]}
                    onPress={() => {
                      setSelectedYear(year);
                      // Adjust day if it doesn't exist in the new year/month combination
                      const maxDay = getDaysInMonth(year, selectedMonth);
                      if (selectedDay > maxDay) {
                        setSelectedDay(maxDay);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        textStyle,
                        selectedYear === year && styles.selectedItemText,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month Picker */}
            <View style={styles.pickerColumn}>
              <Text style={[styles.columnTitle, textStyle]}>Month</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.pickerItem,
                      selectedMonth === index && styles.selectedItem,
                    ]}
                    onPress={() => {
                      setSelectedMonth(index);
                      // Adjust day if it doesn't exist in the new month
                      const maxDay = getDaysInMonth(selectedYear, index);
                      if (selectedDay > maxDay) {
                        setSelectedDay(maxDay);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        textStyle,
                        selectedMonth === index && styles.selectedItemText,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Picker */}
            <View style={styles.pickerColumn}>
              <Text style={[styles.columnTitle, textStyle]}>Day</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {days.map((day) => {
                  const isValid = isDateValid(selectedYear, selectedMonth, day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        selectedDay === day && styles.selectedItem,
                        !isValid && styles.disabledItem,
                      ]}
                      onPress={() => isValid && setSelectedDay(day)}
                      disabled={!isValid}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          textStyle,
                          selectedDay === day && styles.selectedItemText,
                          !isValid && styles.disabledItemText,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Selected Date Preview */}
          <View style={styles.previewContainer}>
            <Text style={[styles.previewLabel, subtextStyle]}>Selected Date:</Text>
            <Text style={[styles.previewDate, textStyle]}>
              {months[selectedMonth]} {selectedDay}, {selectedYear}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  container: {
    width: Math.min(screenWidth * 0.9, 400),
    maxHeight: screenHeight * 0.8,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 250,
    padding: SPACING.MD,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  scrollView: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.XS,
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  selectedItem: {
    backgroundColor: COLORS.PRIMARY,
  },
  disabledItem: {
    opacity: 0.3,
  },
  pickerItemText: {
    fontSize: 16,
  },
  selectedItemText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledItemText: {
    color: '#CCCCCC',
  },
  previewContainer: {
    padding: SPACING.MD,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  previewLabel: {
    fontSize: 14,
    marginBottom: SPACING.XS,
  },
  previewDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: SPACING.MD,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomDatePicker;