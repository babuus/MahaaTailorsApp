import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import ConfirmDialog from '../ConfirmDialog';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('ConfirmDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText, getByLabelText } = renderWithProvider(
      <ConfirmDialog
        visible={true}
        title="Delete Customer"
        message="Are you sure you want to delete this customer?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Delete Customer')).toBeTruthy();
    expect(getByText('Are you sure you want to delete this customer?')).toBeTruthy();
    expect(getByText('Confirm')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('calls onConfirm when confirm button is pressed', () => {
    const { getByText } = renderWithProvider(
      <ConfirmDialog
        visible={true}
        title="Delete Customer"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.press(getByText('Confirm'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is pressed', () => {
    const { getByText } = renderWithProvider(
      <ConfirmDialog
        visible={true}
        title="Delete Customer"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.press(getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom button text when provided', () => {
    const { getByText } = renderWithProvider(
      <ConfirmDialog
        visible={true}
        title="Delete Customer"
        message="Are you sure?"
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Delete')).toBeTruthy();
    expect(getByText('Keep')).toBeTruthy();
  });
});