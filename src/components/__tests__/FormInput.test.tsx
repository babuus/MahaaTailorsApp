import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import FormInput from '../FormInput';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('FormInput', () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    const { getByDisplayValue, getByLabelText } = renderWithProvider(
      <FormInput
        label="Name"
        value="John Doe"
        onChangeText={mockOnChangeText}
      />
    );

    expect(getByDisplayValue('John Doe')).toBeTruthy();
    expect(getByLabelText('Name')).toBeTruthy();
  });

  it('shows required indicator when required is true', () => {
    const { getByLabelText } = renderWithProvider(
      <FormInput
        label="Name"
        value=""
        onChangeText={mockOnChangeText}
        required={true}
      />
    );

    expect(getByLabelText('Name *')).toBeTruthy();
  });

  it('displays error message when error is provided', () => {
    const errorMessage = 'This field is required';
    const { getByText, getByLabelText } = renderWithProvider(
      <FormInput
        label="Name"
        value=""
        onChangeText={mockOnChangeText}
        error={errorMessage}
      />
    );

    expect(getByText(errorMessage)).toBeTruthy();
    expect(getByLabelText(`Error: ${errorMessage}`)).toBeTruthy();
  });

  it('calls onChangeText when text is changed', () => {
    const { getByDisplayValue } = renderWithProvider(
      <FormInput
        label="Name"
        value="John"
        onChangeText={mockOnChangeText}
      />
    );

    const input = getByDisplayValue('John');
    fireEvent.changeText(input, 'John Doe');
    
    expect(mockOnChangeText).toHaveBeenCalledWith('John Doe');
  });

  it('supports multiline input', () => {
    const { getByDisplayValue } = renderWithProvider(
      <FormInput
        label="Address"
        value="123 Main St"
        onChangeText={mockOnChangeText}
        multiline={true}
        numberOfLines={3}
      />
    );

    const input = getByDisplayValue('123 Main St');
    expect(input.props.multiline).toBe(true);
  });
});