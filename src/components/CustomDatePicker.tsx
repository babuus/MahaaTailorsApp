import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import MaterialIcon from './MaterialIcon';

interface CustomDatePickerProps {
  visible: boolean;
  value?: Date;
  onDateChange: (date: Date) => void;
  onCancel: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
  deliveryCounts?: { [dateString: string]: number }; // Format: "2024-01-15": 3
  overdueDeliveries?: { [dateString: string]: number }; // Format: "2024-01-15": 2 (incomplete deliveries)
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  visible,
  value,
  onDateChange,
  onCancel,
  maximumDate,
  minimumDate,
  deliveryCounts = {},
  overdueDeliveries = {},
}) => {
  const { isDarkMode } = useThemeContext();
  const currentDate = value && value instanceof Date ? value : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(currentDate);

  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names for calendar header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get calendar data for current month
  const getCalendarData = useCallback(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const calendar = [];
    const current = new Date(startDate);

    // Generate 6 weeks (42 days) to fill calendar grid
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(current);
        const dateString = date.toISOString().split('T')[0];
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        const isDisabled = (minimumDate && date < minimumDate) || (maximumDate && date > maximumDate);
        const deliveryCount = deliveryCounts[dateString] || 0;
        const overdueCount = overdueDeliveries[dateString] || 0;
        const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
        const hasOverdueDeliveries = isPastDate && overdueCount > 0;

        weekDays.push({
          date,
          day: date.getDate(),
          isCurrentMonth,
          isToday,
          isSelected,
          isDisabled,
          deliveryCount,
          overdueCount,
          hasOverdueDeliveries,
          dateString,
        });

        current.setDate(current.getDate() + 1);
      }
      calendar.push(weekDays);
    }

    return calendar;
  }, [currentYear, currentMonth, selectedDate, minimumDate, maximumDate, deliveryCounts]);

  const handleDateSelect = (date: Date) => {
    if ((minimumDate && date < minimumDate) || (maximumDate && date > maximumDate)) {
      return;
    }
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  const handleCancel = () => {
    setSelectedDate(currentDate);
    onCancel();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const calendar = getCalendarData();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
          {/* Header with Month Navigation */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('prev')}
            >
              <MaterialIcon name="chevron-left" size={24} color={isDarkMode ? '#FFF' : '#000'} />
            </TouchableOpacity>
            
            <Text style={[styles.monthTitle, { color: isDarkMode ? '#FFF' : '#000' }]}>
              {months[currentMonth]} {currentYear}
            </Text>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('next')}
            >
              <MaterialIcon name="chevron-right" size={24} color={isDarkMode ? '#FFF' : '#000'} />
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <View style={styles.calendar}>
            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {dayNames.map((dayName) => (
                <View key={dayName} style={styles.dayHeader}>
                  <Text style={[styles.dayHeaderText, { color: isDarkMode ? '#999' : '#666' }]}>
                    {dayName}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            {calendar.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.week}>
                {week.map((dayData, dayIndex) => (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      !dayData.isCurrentMonth && styles.otherMonthDay,
                      dayData.isToday && styles.todayCell,
                      dayData.isSelected && styles.selectedCell,
                      dayData.isDisabled && styles.disabledCell,
                    ]}
                    onPress={() => handleDateSelect(dayData.date)}
                    disabled={dayData.isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isDarkMode ? '#FFF' : '#000' },
                        !dayData.isCurrentMonth && styles.otherMonthText,
                        dayData.isToday && styles.todayText,
                        dayData.isSelected && styles.selectedText,
                        dayData.isDisabled && styles.disabledText,
                      ]}
                    >
                      {dayData.day}
                    </Text>
                    
                    {/* Delivery Count Badge */}
                    {dayData.deliveryCount > 0 && (
                      <View style={[
                        styles.deliveryBadge,
                        dayData.hasOverdueDeliveries && styles.overdueBadge
                      ]}>
                        <Text style={styles.deliveryCount}>
                          {dayData.deliveryCount}
                        </Text>
                      </View>
                    )}
                    
                    {/* Overdue Indicator for past dates with incomplete deliveries */}
                    {dayData.hasOverdueDeliveries && dayData.overdueCount > 0 && (
                      <View style={styles.overdueIndicator}>
                        <Text style={styles.overdueCount}>
                          !{dayData.overdueCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Selected Date Preview */}
          {selectedDate && (
            <View style={styles.previewContainer}>
              <Text style={[styles.previewLabel, { color: isDarkMode ? '#999' : '#666' }]}>
                Selected Date:
              </Text>
              <Text style={[styles.previewDate, { color: isDarkMode ? '#FFF' : '#000' }]}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              
              {/* Delivery Information */}
              {(() => {
                const dateString = selectedDate.toISOString().split('T')[0];
                const totalDeliveries = deliveryCounts[dateString] || 0;
                const overdueCount = overdueDeliveries[dateString] || 0;
                const isPastDate = selectedDate < new Date(new Date().setHours(0, 0, 0, 0));
                
                if (totalDeliveries > 0) {
                  return (
                    <View style={styles.deliveryInfoContainer}>
                      <Text style={[styles.deliveryInfo, { color: isDarkMode ? '#FF9500' : '#FF8C00' }]}>
                        {totalDeliveries} delivery(s) scheduled
                      </Text>
                      
                      {/* Show overdue information for past dates */}
                      {isPastDate && overdueCount > 0 && (
                        <Text style={[styles.overdueInfo, { color: '#FF3B30' }]}>
                          ⚠️ {overdueCount} overdue delivery(s)
                        </Text>
                      )}
                      
                      {/* Show completed deliveries for past dates */}
                      {isPastDate && overdueCount < totalDeliveries && (
                        <Text style={[styles.completedInfo, { color: '#34C759' }]}>
                          ✅ {totalDeliveries - overdueCount} completed
                        </Text>
                      )}
                    </View>
                  );
                }
                return null;
              })()}
            </View>
          )}

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
              disabled={!selectedDate}
            >
              <Text style={[styles.confirmButtonText, !selectedDate && { opacity: 0.5 }]}>
                Confirm
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: SPACING.LG,
  },
  container: {
    width: Math.min(screenWidth * 0.95, 380),
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navButton: {
    padding: SPACING.SM,
    borderRadius: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  calendar: {
    padding: SPACING.MD,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: SPACING.SM,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  week: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 8,
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    opacity: 0.3,
  },
  todayCell: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  todayText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  selectedCell: {
    backgroundColor: COLORS.PRIMARY,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledCell: {
    opacity: 0.3,
  },
  disabledText: {
    color: '#CCCCCC',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  overdueBadge: {
    backgroundColor: '#FF3B30', // Red background for overdue deliveries
  },
  overdueIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueCount: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
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
  deliveryInfo: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: SPACING.XS,
  },
  deliveryInfoContainer: {
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  overdueInfo: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.XS,
  },
  completedInfo: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: SPACING.XS,
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