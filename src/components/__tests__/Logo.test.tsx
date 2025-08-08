import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import Logo from '../Logo';

// Mock the theme provider for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider theme={MD3LightTheme}>
    {children}
  </PaperProvider>
);

describe('Logo Component', () => {
  it('renders full logo variant correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <Logo variant="full" />
      </TestWrapper>
    );
    
    expect(getByText('Mahaa')).toBeTruthy();
    expect(getByText('tailors')).toBeTruthy();
  });

  it('renders compact logo variant correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <Logo variant="compact" />
      </TestWrapper>
    );
    
    expect(getByText('M')).toBeTruthy();
    expect(getByText('TAILORS')).toBeTruthy();
  });

  it('renders icon logo variant correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <Logo variant="icon" />
      </TestWrapper>
    );
    
    expect(getByText('M')).toBeTruthy();
  });

  it('applies different sizes correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <Logo variant="full" size="large" />
      </TestWrapper>
    );
    
    const mahaText = getByText('Mahaa');
    // Style is an array, so we need to check if any style object contains fontSize: 32
    const styles = Array.isArray(mahaText.props.style) ? mahaText.props.style : [mahaText.props.style];
    const hasLargeFontSize = styles.some(style => style && style.fontSize === 32);
    expect(hasLargeFontSize).toBe(true);
  });

  it('renders without animation by default', () => {
    const { getByText } = render(
      <TestWrapper>
        <Logo variant="full" animated={false} />
      </TestWrapper>
    );
    
    expect(getByText('tailors')).toBeTruthy();
  });
});