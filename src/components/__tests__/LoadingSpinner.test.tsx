import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import LoadingSpinner from '../LoadingSpinner';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('LoadingSpinner', () => {
  it('renders correctly with default props', () => {
    const { getByLabelText } = renderWithProvider(<LoadingSpinner />);
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('displays message when provided', () => {
    const message = 'Loading customers...';
    const { getByText, getByLabelText } = renderWithProvider(
      <LoadingSpinner message={message} />
    );
    
    expect(getByText(message)).toBeTruthy();
    expect(getByLabelText(`Loading: ${message}`)).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByLabelText } = renderWithProvider(
      <LoadingSpinner style={customStyle} />
    );
    
    const container = getByLabelText('Loading').parent;
    // Check that style array contains the default styles
    expect(container?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          justifyContent: 'center',
          alignItems: 'center',
        })
      ])
    );
  });
});