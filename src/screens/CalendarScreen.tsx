import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { LoadingSpinner, ModernCard, ModernButton } from '../components';
import { Bill, CalendarEvent } from '../types';
import { getBills } from '../services/api';

interface CalendarScreenProps {
  navigation: any;
}

type CalendarView = 'monthly' | 'weekly' | 'daily';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

interface CalendarWeek {
  days: CalendarDay[];
}

const { width: screenWidth } = Dimensions.get('window');
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>('monthly');
  const [bills, setBills] = useState<Bill[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBills = useCallback(async (startDate?: Date, endDate?: Date) => {
    setIsLoading(true);
    try {
      const params = {
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0],
        limit: 100,
      };
      
      const billsResponse = await getBills(params);
      setBills(billsResponse.items);
      
      // Convert bills to calendar events
      const events = convertBillsToEvents(billsResponse.items);
      setCalendarEvents(events);
    } catch (error) {
      console.error('Error loading bills:', error);
      Alert.alert('Error', 'Failed to load calendar data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const convertBillsToEvents = (bills: Bill[]): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    bills.forEach(bill => {
      // Skip bills without customer data
      if (!bill.customer?.personalDetails?.name) {
        console.warn(`Bill ${bill.billNumber} missing customer data, skipping calendar events`);
        return;
      }

      // Add billing date event
      events.push({
        id: `billing-${bill.id}`,
        type: 'billing',
        date: bill.billingDate,
        billId: bill.id,
        billNumber: bill.billNumber,
        customerName: bill.customer.personalDetails.name,
        amount: bill.totalAmount,
        status: bill.status,
      });
      
      // Add delivery date event
      events.push({
        id: `delivery-${bill.id}`,
        type: 'delivery',
        date: bill.deliveryDate,
        billId: bill.id,
        billNumber: bill.billNumber,
        customerName: bill.customer.personalDetails.name,
        amount: bill.totalAmount,
        status: bill.status,
      });
    });
    
    return events;
  };

  const refreshCalendar = useCallback(async () => {
    setIsRefreshing(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    await loadBills(startOfMonth, endOfMonth);
  }, [currentDate, loadBills]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Calendar',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={refreshCalendar}
            style={styles.headerButton}
            disabled={isRefreshing}
          >
            <MaterialIcon 
              name="refresh" 
              size={24} 
              color={isRefreshing ? "#999" : "#007AFF"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCurrentDate(new Date())}
            style={styles.headerButton}
          >
            <MaterialIcon name="today" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, refreshCalendar, isRefreshing]);

  useEffect(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    loadBills(startOfMonth, endOfMonth);
  }, [currentDate, loadBills]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateString = date.toISOString().split('T')[0];
    return calendarEvents.filter(event => event.date === dateString);
  };

  const generateMonthCalendar = (): CalendarWeek[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks: CalendarWeek[] = [];
    const today = new Date();
    
    for (let week = 0; week < 6; week++) {
      const days: CalendarDay[] = [];
      
      for (let day = 0; day < 7; day++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + (week * 7) + day);
        
        const isCurrentMonth = currentDay.getMonth() === month;
        const isToday = currentDay.toDateString() === today.toDateString();
        const events = getEventsForDate(currentDay);
        
        days.push({
          date: currentDay,
          isCurrentMonth,
          isToday,
          events,
        });
      }
      
      weeks.push({ days });
      
      // Stop if we've passed the last day of the month and filled the week
      if (weeks[week].days[6].date > lastDay) {
        break;
      }
    }
    
    return weeks;
  };

  const generateWeekCalendar = (): CalendarDay[] => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
      const isToday = day.toDateString() === today.toDateString();
      const events = getEventsForDate(day);
      
      days.push({
        date: day,
        isCurrentMonth,
        isToday,
        events,
      });
    }
    
    return days;
  };

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    const events = getEventsForDate(date);
    
    if (events.length > 0) {
      // Show events for the selected date
      showDateEvents(date, events);
    }
  };

  const showDateEvents = (date: Date, events: CalendarEvent[]) => {
    const dateString = date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const eventsByType = events.reduce((acc, event) => {
      if (!acc[event.type]) acc[event.type] = [];
      acc[event.type].push(event);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);
    
    let message = `Events for ${dateString}:\n\n`;
    
    if (eventsByType.billing) {
      message += `📋 Billing Dates (${eventsByType.billing.length}):\n`;
      eventsByType.billing.forEach(event => {
        message += `• ${event.billNumber} - ${event.customerName} (₹${event.amount?.toFixed(2)})\n`;
      });
      message += '\n';
    }
    
    if (eventsByType.delivery) {
      message += `🚚 Delivery Dates (${eventsByType.delivery.length}):\n`;
      eventsByType.delivery.forEach(event => {
        message += `• ${event.billNumber} - ${event.customerName} (₹${event.amount?.toFixed(2)})\n`;
      });
    }
    
    Alert.alert('Calendar Events', message, [
      { text: 'Close', style: 'cancel' },
      {
        text: 'View Bills',
        onPress: () => {
          // Navigate to bills list filtered by date
          navigation.navigate('Billing', {
            filterDate: date.toISOString().split('T')[0],
          });
        },
      },
    ]);
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'billing': return '#007AFF';
      case 'delivery': return '#34C759';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'fully_paid': return '#34C759';
      case 'partially_paid': return '#FF9500';
      case 'unpaid': return '#FF3B30';
      default: return '#666';
    }
  };

  const renderCalendarHeader = () => {
    const navigate = calendarView === 'monthly' ? navigateMonth : 
                   calendarView === 'weekly' ? navigateWeek : navigateDay;
    
    const getHeaderTitle = () => {
      switch (calendarView) {
        case 'monthly':
          return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        case 'weekly':
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        case 'daily':
          return currentDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        default:
          return '';
      }
    };
    
    return (
      <View style={styles.calendarHeader}>
        <View style={styles.navigationRow}>
          <TouchableOpacity
            onPress={() => navigate('prev')}
            style={styles.navButton}
            testID="prev-period"
          >
            <MaterialIcon name="chevron-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          
          <TouchableOpacity
            onPress={() => navigate('next')}
            style={styles.navButton}
            testID="next-period"
          >
            <MaterialIcon name="chevron-right" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.viewToggle}>
          {(['monthly', 'weekly', 'daily'] as CalendarView[]).map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.viewButton,
                calendarView === view && styles.viewButtonActive,
              ]}
              onPress={() => setCalendarView(view)}
              testID={`view-${view}`}
            >
              <Text style={[
                styles.viewButtonText,
                calendarView === view && styles.viewButtonTextActive,
              ]}>
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderEventDot = (events: CalendarEvent[]) => {
    if (events.length === 0) return null;
    
    const billingEvents = events.filter(e => e.type === 'billing');
    const deliveryEvents = events.filter(e => e.type === 'delivery');
    
    return (
      <View style={styles.eventDots}>
        {billingEvents.length > 0 && (
          <View style={[styles.eventDot, { backgroundColor: '#007AFF' }]} />
        )}
        {deliveryEvents.length > 0 && (
          <View style={[styles.eventDot, { backgroundColor: '#34C759' }]} />
        )}
        {events.length > 2 && (
          <Text style={styles.eventCount}>+{events.length - 2}</Text>
        )}
      </View>
    );
  };

  const renderMonthlyView = () => {
    const weeks = generateMonthCalendar();
    
    return (
      <View style={styles.monthlyView}>
        <View style={styles.daysOfWeekHeader}>
          {DAYS_OF_WEEK.map((day) => (
            <Text key={day} style={styles.dayOfWeekText}>
              {day}
            </Text>
          ))}
        </View>
        
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.days.map((day, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.dayCell,
                  !day.isCurrentMonth && styles.dayCellInactive,
                  day.isToday && styles.dayCellToday,
                  selectedDate?.toDateString() === day.date.toDateString() && styles.dayCellSelected,
                ]}
                onPress={() => handleDatePress(day.date)}
                testID={`day-${day.date.getDate()}`}
              >
                <Text style={[
                  styles.dayText,
                  !day.isCurrentMonth && styles.dayTextInactive,
                  day.isToday && styles.dayTextToday,
                  selectedDate?.toDateString() === day.date.toDateString() && styles.dayTextSelected,
                ]}>
                  {day.date.getDate()}
                </Text>
                {renderEventDot(day.events)}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderWeeklyView = () => {
    const days = generateWeekCalendar();
    
    return (
      <View style={styles.weeklyView}>
        <View style={styles.weekHeader}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.weekDayHeader,
                day.isToday && styles.weekDayHeaderToday,
                selectedDate?.toDateString() === day.date.toDateString() && styles.weekDayHeaderSelected,
              ]}
              onPress={() => handleDatePress(day.date)}
              testID={`week-day-${index}`}
            >
              <Text style={[
                styles.weekDayName,
                day.isToday && styles.weekDayNameToday,
              ]}>
                {DAYS_OF_WEEK[day.date.getDay()]}
              </Text>
              <Text style={[
                styles.weekDayNumber,
                day.isToday && styles.weekDayNumberToday,
              ]}>
                {day.date.getDate()}
              </Text>
              {renderEventDot(day.events)}
            </TouchableOpacity>
          ))}
        </View>
        
        <ScrollView style={styles.weekEventsContainer}>
          {days.map((day, index) => (
            <View key={index} style={styles.dayEventsSection}>
              {day.events.length > 0 && (
                <>
                  <Text style={styles.dayEventsTitle}>
                    {day.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric' })}
                  </Text>
                  {day.events.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventItem,
                        { borderLeftColor: getEventTypeColor(event.type) },
                      ]}
                      onPress={() => navigation.navigate('BillDetail', { billId: event.billId })}
                    >
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventType}>
                          {event.type === 'billing' ? '📋 Billing' : '🚚 Delivery'}
                        </Text>
                        <View style={[
                          styles.eventStatusBadge,
                          { backgroundColor: getStatusColor(event.status || '') + '20' },
                        ]}>
                          <Text style={[
                            styles.eventStatusText,
                            { color: getStatusColor(event.status || '') },
                          ]}>
                            {event.status?.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.eventBillNumber}>{event.billNumber}</Text>
                      <Text style={styles.eventCustomer}>{event.customerName}</Text>
                      {event.amount && (
                        <Text style={styles.eventAmount}>₹{event.amount.toFixed(2)}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDailyView = () => {
    const events = getEventsForDate(currentDate);
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();
    
    return (
      <View style={styles.dailyView}>
        <View style={[styles.dailyHeader, isToday && styles.dailyHeaderToday]}>
          <Text style={[styles.dailyDate, isToday && styles.dailyDateToday]}>
            {currentDate.getDate()}
          </Text>
          <Text style={[styles.dailyDay, isToday && styles.dailyDayToday]}>
            {currentDate.toLocaleDateString('en-IN', { weekday: 'long' })}
          </Text>
        </View>
        
        <ScrollView style={styles.dailyEventsContainer}>
          {events.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <MaterialIcon name="event-available" size={48} color="#C7C7CC" />
              <Text style={styles.noEventsText}>No events for this day</Text>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.dailyEventItem,
                  { borderLeftColor: getEventTypeColor(event.type) },
                ]}
                onPress={() => navigation.navigate('BillDetail', { billId: event.billId })}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventType}>
                    {event.type === 'billing' ? '📋 Billing Date' : '🚚 Delivery Date'}
                  </Text>
                  <View style={[
                    styles.eventStatusBadge,
                    { backgroundColor: getStatusColor(event.status || '') + '20' },
                  ]}>
                    <Text style={[
                      styles.eventStatusText,
                      { color: getStatusColor(event.status || '') },
                    ]}>
                      {event.status?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventBillNumber}>{event.billNumber}</Text>
                <Text style={styles.eventCustomer}>{event.customerName}</Text>
                {event.amount && (
                  <Text style={styles.eventAmount}>₹{event.amount.toFixed(2)}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderLegend = () => (
    <ModernCard style={styles.legendCard}>
      <Text style={styles.legendTitle}>Legend</Text>
      <View style={styles.legendItems}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
          <Text style={styles.legendText}>Billing Date</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>Delivery Date</Text>
        </View>
      </View>
    </ModernCard>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading calendar..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {renderCalendarHeader()}
        {renderLegend()}
        
        {calendarView === 'monthly' && renderMonthlyView()}
        {calendarView === 'weekly' && renderWeeklyView()}
        {calendarView === 'daily' && renderDailyView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  calendarHeader: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButtonActive: {
    backgroundColor: '#007AFF',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#666',
  },
  viewButtonTextActive: {
    color: '#FFF',
    fontWeight: '500',
  },
  legendCard: {
    margin: 16,
    marginBottom: 8,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  // Monthly View Styles
  monthlyView: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
  },
  daysOfWeekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E1E1E1',
    position: 'relative',
  },
  dayCellInactive: {
    backgroundColor: '#F8F9FA',
  },
  dayCellToday: {
    backgroundColor: '#E3F2FD',
  },
  dayCellSelected: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 16,
    color: '#000',
  },
  dayTextInactive: {
    color: '#999',
  },
  dayTextToday: {
    fontWeight: '600',
    color: '#007AFF',
  },
  dayTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  eventDots: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventCount: {
    fontSize: 8,
    color: '#666',
  },
  // Weekly View Styles
  weeklyView: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  weekDayHeader: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#E1E1E1',
  },
  weekDayHeaderToday: {
    backgroundColor: '#E3F2FD',
  },
  weekDayHeaderSelected: {
    backgroundColor: '#007AFF',
  },
  weekDayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  weekDayNameToday: {
    color: '#007AFF',
    fontWeight: '600',
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  weekDayNumberToday: {
    color: '#007AFF',
  },
  weekEventsContainer: {
    maxHeight: 400,
    padding: 16,
  },
  dayEventsSection: {
    marginBottom: 16,
  },
  dayEventsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  eventItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  eventStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventStatusText: {
    fontSize: 8,
    fontWeight: '600',
  },
  eventBillNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  eventCustomer: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  eventAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  // Daily View Styles
  dailyView: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dailyHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  dailyHeaderToday: {
    backgroundColor: '#E3F2FD',
  },
  dailyDate: {
    fontSize: 48,
    fontWeight: '300',
    color: '#000',
  },
  dailyDateToday: {
    color: '#007AFF',
  },
  dailyDay: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  dailyDayToday: {
    color: '#007AFF',
    fontWeight: '500',
  },
  dailyEventsContainer: {
    padding: 16,
    maxHeight: 400,
  },
  dailyEventItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});