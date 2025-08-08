import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccessibleButton from '../AccessibleButton';

// Mock the accessibility utils
jest.mock('../../utils/accessibility', () => ({
  useAccessibility: () => ({
    generateButtonHint: jest.fn((action) => `Tap to ${action}`),
    ensureMinimumTouchTarget: jest.fn((size) => Math.max(size, 44)),
    getAccessibleColors: jest.fn(() => ({
      PRIMARY: '#2196F3',
      ERROR: '#F44336',
      SUCCESS: '#4CAF50',
      TEXT_PRIMARY: '#000000',
      BACKGROUND_PRIMARY: '#FFFFFF',
      BACKGROUND_SECONDARY: '#F0F0F0',
    })),
  }),
}));

describe('AccessibleButton', () => {
  const defaultProps = {
    title: 'Test Button',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with default props', () => {
    const { getByText, getByRole } = render(<AccessibleButton {...defaultProps} />);

    expect(getByText('Test Button')).toBeTruthy();
    expect(getByRole('button')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<AccessibleButton {...defaultProps} onPress={onPress} />);

    fireEvent.press(getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AccessibleButton {...defaultProps} onPress={onPress} disabled={true} />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should show loading state when loading prop is true', () => {
    const { getByText, getByRole } = render(
      <AccessibleButton {...defaultProps} loading={true} />
    );

    expect(getByText('Loading...')).toBeTruthy();
    expect(getByRole('button').props.accessibilityState.busy).toBe(true);
  });

  it('should render with different variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'text', 'danger'] as const;

    variants.forEach((variant) => {
      const { getByRole } = render(
        <AccessibleButton {...defaultProps} variant={variant} />
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  it('should render with different sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach((size) => {
      const { getByRole } = render(
        <AccessibleButton {...defaultProps} size={size} />
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  it('should render with icon on left', () => {
    const { getByRole } = render(
      <AccessibleButton {...defaultProps} icon="add" iconPosition="left" />
    );

    expect(getByRole('button')).toBeTruthy();
  });

  it('should render with icon on right', () => {
    const { getByRole } = render(
      <AccessibleButton {...defaultProps} icon="add" iconPosition="right" />
    );

    expect(getByRole('button')).toBeTruthy();
  });

  it('should use custom accessibility label', () => {
    const customLabel = 'Custom accessibility label';
    const { getByRole } = render(
      <AccessibleButton {...defaultProps} accessibilityLabel={customLabel} />
    );

    expect(getByRole('button').props.accessibilityLabel).toBe(customLabel);
  });

  it('should use custom accessibility hint', () => {
    const customHint = 'Custom accessibility hint';
    const { getByRole } = render(
      <AccessibleButton {...defaultProps} accessibilityHint={customHint} />
    );

    expect(getByRole('button').props.accessibilityHint).toBe(customHint);
  });

  it('should render full width when fullWidth prop is true', () => {
    const { getByRole } = render(
      <AccessibleButton {...defaultProps} fullWidth={true} />
    );

    const button = getByRole('button');
    expect(button.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: '100%',
        }),
      ])
    );
  });

  it('should have correct testID', () => {
    const testID = 'test-button';
    const { getByTestId } = render(
      <AccessibleButton {...defaultProps} testID={testID} />
    );

    expect(getByTestId(testID)).toBeTruthy();
  });

  it('should not render icon when loading', () => {
    const { queryByTestId } = render(
      <AccessibleButton {...defaultProps} icon="add" loading={true} />
    );

    // Icon should not be rendered when loading
    expect(queryByTestId('button-icon')).toBeNull();
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const customTextStyle = { color: 'white' };

    const { getByRole } = render(
      <AccessibleButton
        {...defaultProps}
        style={customStyle}
        textStyle={customTextStyle}
      />
    );

    const button = getByRole('button');
    expect(button.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });
});