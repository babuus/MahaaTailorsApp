import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MeasurementConfigListItem from '../MeasurementConfigListItem';

// Mock the theme context
jest.mock('../../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    isDarkMode: false,
  }),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

const mockItem = {
  id: '1',
  garmentType: 'Shirt',
  measurements: ['Chest', 'Waist', 'Length'],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('MeasurementConfigListItem', () => {
  const mockOnPress = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders item information correctly', () => {
    const { getByText } = render(
      <MeasurementConfigListItem
        item={mockItem}
        onPress={mockOnPress}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="test-item"
      />
    );

    expect(getByText('Shirt')).toBeTruthy();
    expect(getByText('3 fields')).toBeTruthy();
    expect(getByText('Fields: Chest, Waist, Length')).toBeTruthy();
  });

  it('handles item press', () => {
    const { getByTestId } = render(
      <MeasurementConfigListItem
        item={mockItem}
        onPress={mockOnPress}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="test-item"
      />
    );

    const item = getByTestId('test-item');
    fireEvent.press(item);

    expect(mockOnPress).toHaveBeenCalledWith(mockItem);
  });

  it('handles edit button press', () => {
    const { getByLabelText } = render(
      <MeasurementConfigListItem
        item={mockItem}
        onPress={mockOnPress}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="test-item"
      />
    );

    const editButton = getByLabelText('Edit template');
    fireEvent.press(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
  });

  describe('Delete functionality', () => {
    it('shows confirmation dialog when delete button is pressed', () => {
      const { getByLabelText } = render(
        <MeasurementConfigListItem
          item={mockItem}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          testID="test-item"
        />
      );

      const deleteButton = getByLabelText('Delete template');
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Template',
        'Are you sure you want to delete the "Shirt" template? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: expect.any(Function),
          },
        ]
      );
    });

    it('calls onDelete when user confirms deletion', () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        // Simulate user pressing the "Delete" button
        const deleteButton = buttons?.find((button: any) => button.text === 'Delete');
        if (deleteButton && deleteButton.onPress) {
          deleteButton.onPress();
        }
      });

      const { getByLabelText } = render(
        <MeasurementConfigListItem
          item={mockItem}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          testID="test-item"
        />
      );

      const deleteButton = getByLabelText('Delete template');
      fireEvent.press(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockItem);
    });

    it('does not call onDelete when user cancels deletion', () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        // Simulate user pressing the "Cancel" button
        const cancelButton = buttons?.find((button: any) => button.text === 'Cancel');
        if (cancelButton && cancelButton.onPress) {
          cancelButton.onPress();
        }
      });

      const { getByLabelText } = render(
        <MeasurementConfigListItem
          item={mockItem}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          testID="test-item"
        />
      );

      const deleteButton = getByLabelText('Delete template');
      fireEvent.press(deleteButton);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('shows correct confirmation message for different garment types', () => {
      const pantsItem = {
        ...mockItem,
        id: '2',
        garmentType: 'Pants',
      };

      const { getByLabelText } = render(
        <MeasurementConfigListItem
          item={pantsItem}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          testID="test-item"
        />
      );

      const deleteButton = getByLabelText('Delete template');
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Template',
        'Are you sure you want to delete the "Pants" template? This action cannot be undone.',
        expect.any(Array)
      );
    });
  });

  it('renders without optional props', () => {
    const { getByText } = render(
      <MeasurementConfigListItem item={mockItem} />
    );

    expect(getByText('Shirt')).toBeTruthy();
    expect(getByText('3 fields')).toBeTruthy();
  });

  it('handles singular field count correctly', () => {
    const singleFieldItem = {
      ...mockItem,
      measurements: ['Chest'],
    };

    const { getByText } = render(
      <MeasurementConfigListItem
        item={singleFieldItem}
        onPress={mockOnPress}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(getByText('1 field')).toBeTruthy();
  });

  it('handles empty measurements array', () => {
    const emptyMeasurementsItem = {
      ...mockItem,
      measurements: [],
    };

    const { getByText, queryByText } = render(
      <MeasurementConfigListItem
        item={emptyMeasurementsItem}
        onPress={mockOnPress}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(getByText('0 fields')).toBeTruthy();
    expect(queryByText('Fields:')).toBeFalsy();
  });

  it('truncates long measurement lists', () => {
    const longMeasurementsItem = {
      ...mockItem,
      measurements: ['Chest', 'Waist', 'Length', 'Shoulder', 'Sleeve'],
    };

    const { getByText } = render(
      <MeasurementConfigListItem
        item={longMeasurementsItem}
        onPress={mockOnPress}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(getByText('Fields: Chest, Waist, Length...')).toBeTruthy();
  });

  it('has proper accessibility labels', () => {
    const { getByLabelText } = render(
      <MeasurementConfigListItem
        item={mockItem}
        onPress={mockOnPress}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        testID="test-item"
      />
    );

    expect(getByLabelText('Shirt template with 3 fields')).toBeTruthy();
    expect(getByLabelText('Edit template')).toBeTruthy();
    expect(getByLabelText('Delete template')).toBeTruthy();
  });
});