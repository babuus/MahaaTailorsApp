import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { BillingConfigItemForm } from '../BillingConfigItemForm';
import { createBillingConfigItem, updateBillingConfigItem } from '../../services/api';
import { BillingConfigItem } from '../../types';

// Mock the API services
jest.mock('../../services/api', () => ({
  createBillingConfigItem: jest.fn(),
  updateBillingConfigItem: jest.fn(),
}));

// Mock the hooks
jest.mock('../../hooks/useFormValidation', () => ({
  useFormValidation: jest.fn(() => ({
    data: {
      name: '',
      description: '',
      price: 0,
      category: 'service',
    },
    validation: {
      errors: {},
      touched: {},
    },
    updateField: jest.fn(),
    markFieldAsTouched: jest.fn(),
    validateForm: jest.fn(() => true),
    resetForm: jest.fn(),
  })),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
  if (buttons && buttons.length > 0) {
    buttons[0].onPress?.();
  }
});

const mockNavigation = {
  setOptions: jest.fn(),
  goBack: jest.fn(),
};

const mockCreateBillingConfigItem = createBillingConfigItem as jest.MockedFunction<typeof createBillingConfigItem>;
const mockUpdateBillingConfigItem = updateBillingConfigItem as jest.MockedFunction<typeof updateBillingConfigItem>;

const mockItem: BillingConfigItem = {
  id: '1',
  name: 'Shirt Stitching',
  description: 'Basic shirt stitching service',
  price: 500,
  category: 'service',
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('BillingConfigItemForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Add Mode', () => {
    const addModeProps = {
      navigation: mockNavigation,
      route: {
        params: {
          mode: 'add' as const,
        },
      },
    };

    it('renders correctly in add mode', () => {
      const { getByTestId, getByText } = render(
        <BillingConfigItemForm {...addModeProps} />
      );

      expect(getByTestId('item-name-input')).toBeTruthy();
      expect(getByTestId('item-description-input')).toBeTruthy();
      expect(getByTestId('item-price-input')).toBeTruthy();
      expect(getByTestId('category-service')).toBeTruthy();
      expect(getByTestId('category-material')).toBeTruthy();
      expect(getByTestId('category-alteration')).toBeTruthy();
      expect(getByText('Create Item')).toBeTruthy();
    });

    it('sets correct navigation options for add mode', () => {
      render(<BillingConfigItemForm {...addModeProps} />);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Add Billing Item',
        })
      );
    });

    it('creates new billing item when form is submitted', async () => {
      const newItem = {
        id: '2',
        name: 'New Service',
        description: 'New service description',
        price: 300,
        category: 'service' as const,
        isActive: true,
        createdAt: '2023-01-03T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
      };

      mockCreateBillingConfigItem.mockResolvedValue(newItem);

      const { getByTestId } = render(
        <BillingConfigItemForm {...addModeProps} />
      );

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockCreateBillingConfigItem).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Billing item created successfully!',
          expect.any(Array)
        );
      });
    });

    it('handles creation error gracefully', async () => {
      mockCreateBillingConfigItem.mockRejectedValue(new Error('Creation failed'));

      const { getByTestId } = render(
        <BillingConfigItemForm {...addModeProps} />
      );

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to create billing item. Please try again.'
        );
      });
    });
  });

  describe('Edit Mode', () => {
    const editModeProps = {
      navigation: mockNavigation,
      route: {
        params: {
          mode: 'edit' as const,
          item: mockItem,
        },
      },
    };

    it('renders correctly in edit mode', () => {
      const { getByTestId, getByText } = render(
        <BillingConfigItemForm {...editModeProps} />
      );

      expect(getByTestId('item-name-input')).toBeTruthy();
      expect(getByTestId('item-description-input')).toBeTruthy();
      expect(getByTestId('item-price-input')).toBeTruthy();
      expect(getByText('Update Item')).toBeTruthy();
    });

    it('sets correct navigation options for edit mode', () => {
      render(<BillingConfigItemForm {...editModeProps} />);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Edit Billing Item',
        })
      );
    });

    it('updates billing item when form is submitted', async () => {
      const updatedItem = {
        ...mockItem,
        name: 'Updated Service',
        updatedAt: '2023-01-04T00:00:00Z',
      };

      mockUpdateBillingConfigItem.mockResolvedValue(updatedItem);

      const { getByTestId } = render(
        <BillingConfigItemForm {...editModeProps} />
      );

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockUpdateBillingConfigItem).toHaveBeenCalledWith(
          mockItem.id,
          expect.any(Object)
        );
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Billing item updated successfully!',
          expect.any(Array)
        );
      });
    });

    it('handles update error gracefully', async () => {
      mockUpdateBillingConfigItem.mockRejectedValue(new Error('Update failed'));

      const { getByTestId } = render(
        <BillingConfigItemForm {...editModeProps} />
      );

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to update billing item. Please try again.'
        );
      });
    });
  });

  describe('Form Interactions', () => {
    const defaultProps = {
      navigation: mockNavigation,
      route: {
        params: {
          mode: 'add' as const,
        },
      },
    };

    it('allows selecting different categories', () => {
      const { getByTestId } = render(
        <BillingConfigItemForm {...defaultProps} />
      );

      expect(getByTestId('category-service')).toBeTruthy();
      expect(getByTestId('category-material')).toBeTruthy();
      expect(getByTestId('category-alteration')).toBeTruthy();

      fireEvent.press(getByTestId('category-material'));
      fireEvent.press(getByTestId('category-alteration'));
    });

    it('navigates back when cancel button is pressed', () => {
      const { getByTestId } = render(
        <BillingConfigItemForm {...defaultProps} />
      );

      fireEvent.press(getByTestId('cancel-button'));

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('navigates back when header back button is pressed', () => {
      render(<BillingConfigItemForm {...defaultProps} />);

      // The header back button is set in navigation options
      const setOptionsCall = mockNavigation.setOptions.mock.calls[0][0];
      const headerLeft = setOptionsCall.headerLeft();
      
      // Simulate pressing the header back button
      fireEvent.press(headerLeft);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error when form is invalid', async () => {
      const { useFormValidation } = require('../../hooks/useFormValidation');
      useFormValidation.mockReturnValue({
        data: {
          name: '',
          description: '',
          price: 0,
          category: 'service',
        },
        validation: {
          errors: { name: 'Name is required' },
          touched: { name: true },
        },
        updateField: jest.fn(),
        markFieldAsTouched: jest.fn(),
        validateForm: jest.fn(() => false),
        resetForm: jest.fn(),
      });

      const { getByTestId } = render(
        <BillingConfigItemForm {...{
          navigation: mockNavigation,
          route: {
            params: {
              mode: 'add' as const,
            },
          },
        }} />
      );

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Please fix the errors in the form.'
        );
      });
    });
  });
});