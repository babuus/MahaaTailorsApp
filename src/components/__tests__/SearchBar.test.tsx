import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchBar from '../SearchBar';

// Mock the ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    isDarkMode: false,
  }),
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(component);
};

// Mock timers for debounce testing
jest.useFakeTimers();

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('renders correctly with default placeholder', () => {
    const { getByPlaceholderText } = renderWithProvider(
      <SearchBar onSearch={mockOnSearch} />
    );

    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Search customers...';
    const { getByPlaceholderText } = renderWithProvider(
      <SearchBar placeholder={customPlaceholder} onSearch={mockOnSearch} />
    );

    expect(getByPlaceholderText(customPlaceholder)).toBeTruthy();
  });

  it('debounces search calls', async () => {
    const { getByPlaceholderText } = renderWithProvider(
      <SearchBar onSearch={mockOnSearch} debounceMs={300} />
    );

    const searchInput = getByPlaceholderText('Search...');
    
    // Type multiple characters quickly
    fireEvent.changeText(searchInput, 'J');
    fireEvent.changeText(searchInput, 'Jo');
    fireEvent.changeText(searchInput, 'John');

    // Should not have called onSearch yet
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Fast-forward time to trigger debounce
    jest.advanceTimersByTime(300);

    // Should have called onSearch only once with final value
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith('John');
  });

  it('clears search when clear icon is pressed', () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(
      <SearchBar onSearch={mockOnSearch} />
    );

    const searchInput = getByPlaceholderText('Search...');
    
    // Enter some text
    fireEvent.changeText(searchInput, 'test');
    
    // Fast-forward time to trigger debounce
    jest.advanceTimersByTime(300);
    
    // Find and press the clear button (clear icon)
    const clearButton = getByTestId('clear-button');
    fireEvent.press(clearButton);
    
    // Should call onSearch with empty string
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });
});