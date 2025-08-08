import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MeasurementConfigFormScreen from '../MeasurementConfigFormScreen';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    createMeasurementConfig: jest.fn(),
    updateMeasurementConfig: jest.fn(),
  },
}));

// Mock the theme context
jest.mock('../../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    isDarkMode: false,
  }),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

describe('MeasurementConfigFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Add Mode', () => {
    const mockRoute = {
      params: {
        mode: 'add' as const,
      },
    };

    it('renders add form correctly', () => {
      const { getByText, getByTestId } = render(
        <MeasurementConfigFormScreen 
          navigation={mockNavigation as any} 
          route={mockRoute as any} 
        />
      );

      expect(getByText('Garment Type')).toBeTruthy();
      expect(getByText('Measurement Fields')).toBeTruthy();
      expect(getByText('Create')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByTestId('garment-type-input')).toBeTruthy();
      expect(getByTestId('measurement-field-0')).toBeTruthy();
    });

    it('validates required fields', async () => {
      const { getByTestId } = render(
        <MeasurementConfigFormScreen 
          navigation={mockNavigation as any} 
          route={mockRoute as any} 
        />
      );

      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      // Should not call API without required fields
      expect(apiService.createMeasurementConfig).not.toHaveBeenCalled();
    });

    it('adds measurement fields', () => {
      const { getByTestId, queryByTestId } = render(
        <MeasurementConfigFormScreen 
          navigation={mockNavigation as any} 
          route={mockRoute as any} 
        />
      );

      const addButton = getByTestId('add-measurement-field-button');
      fireEvent.press(addButton);

      expect(queryByTestId('measurement-field-1')).toBeTruthy();
    });

    it('removes measurement fields', () => {
      const { getByTestId, queryByTestId } = render(
        <MeasurementConfigFormScreen 
          navigation={mockNavigation as any} 
          route={mockRoute as any} 
        />
      );

      // Add a second field first
      const addButton = getByTestId('add-measurement-field-button');
      fireEvent.press(addButton);

      // Now remove the second field
      const removeButton = getByTestId('remove-measurement-field-1');
      fireEvent.press(removeButton);

      expect(queryByTestId('measurement-field-1')).toBeFalsy();
    });

    it('creates measurement config successfully', async () => {
      (apiService.createMeasurementConfig as jest.Mock).mockResolvedValue({
        id: '1',
        garmentType: 'Shirt',
        measurements: ['Chest', 'Waist'],
      });

      const { getByTestId } = render(
        <MeasurementConfigFormScreen 
          navigation={mockNavigation as any} 
          route={mockRoute as any} 
        />
      );

      const garmentTypeInput = getByTestId('garment-type-input');
      const measurementField = getByTestId('measurement-field-0');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(garmentTypeInput, 'Shirt');
      fireEvent.changeText(measurementField, 'Chest');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(apiService.createMeasurementConfig).toHaveBeenCalledWith({
          garmentType: 'Shirt',
          measurements: ['Chest'],
        });
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const mockConfig = {
      id: '1',
      garmentType: 'Shirt',
      measurements: ['Chest', 'Waist'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    const mockRoute = {
      params: {
        mode: 'edit' as const,
        config: mockConfig,
      },
    };

    it('renders edit form with existing data', () => {
      const { getByText, getByDisplayValue } = render(
        <MeasurementConfigFormScreen 
          navigation={mockNavigation as any} 
          route={mockRoute as any} 
        />
      );

      expect(getByText('Update')).toBeTruthy();
      expect(getByDisplayValue('Shirt')).toBeTruthy();
      expect(getByDisplayValue('Chest')).toBeTruthy();
      expect(getByDisplayValue('Waist')).toBeTruthy();
    });

    it('updates measurement config successfully', async () => {
      (apiService.updateMeasurementConfig as jest.Mock).mockResolvedValue({
        ...mockConfig,
        garmentType: 'Updated Shirt',
      });

      const { getByTestId, getByDisplayValue } = render(
        <MeasurementConfigFormScreen 
          navigation={mockNavigation as any} 
          route={mockRoute as any} 
        />
      );

      const garmentTypeInput = getByDisplayValue('Shirt');
      const saveButton = getByTestId('save-button');

      fireEvent.changeText(garmentTypeInput, 'Updated Shirt');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(apiService.updateMeasurementConfig).toHaveBeenCalledWith('1', {
          id: '1',
          garmentType: 'Updated Shirt',
          measurements: ['Chest', 'Waist'],
        });
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('handles cancel button', () => {
    const mockRoute = {
      params: {
        mode: 'add' as const,
      },
    };

    const { getByTestId } = render(
      <MeasurementConfigFormScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    const cancelButton = getByTestId('cancel-button');
    fireEvent.press(cancelButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});