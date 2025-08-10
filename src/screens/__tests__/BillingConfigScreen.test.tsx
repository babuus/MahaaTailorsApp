import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { BillingConfigScreen } from '../BillingConfigScreen';
import { 
  getBillingConfigItems, 
  deleteBillingConfigItem,
  getReceivedItemTemplates,
  deleteReceivedItemTemplate 
} from '../../services/api';
import { BillingConfigItem, ReceivedItemTemplate } from '../../types';

// Mock the API services
jest.mock('../../services/api', () => ({
  getBillingConfigItems: jest.fn(),
  deleteBillingConfigItem: jest.fn(),
  getReceivedItemTemplates: jest.fn(),
  deleteReceivedItemTemplate: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
  if (buttons && buttons.length > 1) {
    // Simulate pressing the second button (usually the action button)
    buttons[1].onPress?.();
  }
});

const mockBillingItems: BillingConfigItem[] = [
  {
    id: '1',
    name: 'Shirt Stitching',
    description: 'Basic shirt stitching service',
    price: 500,
    category: 'service',
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Cotton Fabric',
    description: 'Premium cotton fabric',
    price: 200,
    category: 'material',
    isActive: true,
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
];

const mockReceivedTemplates: ReceivedItemTemplate[] = [
  {
    id: '1',
    name: 'Sample Blouse',
    description: 'Customer provided sample blouse',
    category: 'sample',
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Fabric Material',
    description: 'Customer provided fabric',
    category: 'material',
    isActive: true,
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
];

const mockNavigation = {
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

const mockGetBillingConfigItems = getBillingConfigItems as jest.MockedFunction<typeof getBillingConfigItems>;
const mockDeleteBillingConfigItem = deleteBillingConfigItem as jest.MockedFunction<typeof deleteBillingConfigItem>;
const mockGetReceivedItemTemplates = getReceivedItemTemplates as jest.MockedFunction<typeof getReceivedItemTemplates>;
const mockDeleteReceivedItemTemplate = deleteReceivedItemTemplate as jest.MockedFunction<typeof deleteReceivedItemTemplate>;

describe('BillingConfigScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBillingConfigItems.mockResolvedValue(mockBillingItems);
    mockGetReceivedItemTemplates.mockResolvedValue(mockReceivedTemplates);
  });

  it('renders correctly with billing items tab active by default', async () => {
    const { getByText, getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Billing Configuration')).toBeTruthy();
      expect(getByTestId('billing-items-tab')).toBeTruthy();
      expect(getByTestId('received-templates-tab')).toBeTruthy();
    });
  });

  it('loads and displays billing items', async () => {
    const { getByText } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Shirt Stitching')).toBeTruthy();
      expect(getByText('Basic shirt stitching service')).toBeTruthy();
      expect(getByText('₹500.00')).toBeTruthy();
      expect(getByText('Cotton Fabric')).toBeTruthy();
    });

    expect(mockGetBillingConfigItems).toHaveBeenCalled();
  });

  it('switches to received templates tab and displays templates', async () => {
    const { getByText, getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Shirt Stitching')).toBeTruthy();
    });

    fireEvent.press(getByTestId('received-templates-tab'));

    await waitFor(() => {
      expect(getByText('Sample Blouse')).toBeTruthy();
      expect(getByText('Customer provided sample blouse')).toBeTruthy();
      expect(getByText('Fabric Material')).toBeTruthy();
    });
  });

  it('navigates to add billing item form when FAB is pressed on items tab', async () => {
    const { getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('add-config-item-fab')).toBeTruthy();
    });

    fireEvent.press(getByTestId('add-config-item-fab'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('BillingConfigItemForm', {
      mode: 'add',
    });
  });

  it('navigates to add template form when FAB is pressed on templates tab', async () => {
    const { getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('received-templates-tab')).toBeTruthy();
    });

    fireEvent.press(getByTestId('received-templates-tab'));
    fireEvent.press(getByTestId('add-config-item-fab'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ReceivedItemTemplateForm', {
      mode: 'add',
    });
  });

  it('navigates to edit billing item form when edit button is pressed', async () => {
    const { getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('edit-billing-item-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('edit-billing-item-1'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('BillingConfigItemForm', {
      mode: 'edit',
      item: mockBillingItems[0],
    });
  });

  it('deletes billing item when delete button is pressed', async () => {
    mockDeleteBillingConfigItem.mockResolvedValue();

    const { getByTestId, queryByText } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('delete-billing-item-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-billing-item-1'));

    await waitFor(() => {
      expect(mockDeleteBillingConfigItem).toHaveBeenCalledWith('1');
    });

    // Item should be removed from the list
    expect(queryByText('Shirt Stitching')).toBeNull();
  });

  it('deletes received template when delete button is pressed', async () => {
    mockDeleteReceivedItemTemplate.mockResolvedValue();

    const { getByTestId, queryByText } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('received-templates-tab')).toBeTruthy();
    });

    fireEvent.press(getByTestId('received-templates-tab'));

    await waitFor(() => {
      expect(getByTestId('delete-template-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-template-1'));

    await waitFor(() => {
      expect(mockDeleteReceivedItemTemplate).toHaveBeenCalledWith('1');
    });
  });

  it('shows empty state when no billing items exist', async () => {
    mockGetBillingConfigItems.mockResolvedValue([]);

    const { getByText } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('No Billing Items')).toBeTruthy();
      expect(getByText('Add billing items to configure your services and pricing.')).toBeTruthy();
      expect(getByText('Add Billing Item')).toBeTruthy();
    });
  });

  it('shows empty state when no templates exist', async () => {
    mockGetReceivedItemTemplates.mockResolvedValue([]);

    const { getByText, getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('received-templates-tab')).toBeTruthy();
    });

    fireEvent.press(getByTestId('received-templates-tab'));

    await waitFor(() => {
      expect(getByText('No Templates')).toBeTruthy();
      expect(getByText('Add templates for items you commonly receive from customers.')).toBeTruthy();
      expect(getByText('Add Template')).toBeTruthy();
    });
  });

  it('handles API errors gracefully', async () => {
    mockGetBillingConfigItems.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load billing items. Please try again.'
      );
    });
  });

  it('handles delete errors gracefully', async () => {
    mockDeleteBillingConfigItem.mockRejectedValue(new Error('Delete failed'));

    const { getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('delete-billing-item-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-billing-item-1'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to delete billing item. Please try again.'
      );
    });
  });

  it('refreshes data when pull to refresh is triggered', async () => {
    const { getByTestId } = render(
      <BillingConfigScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('billing-config-scroll')).toBeTruthy();
    });

    // Simulate pull to refresh
    const scrollView = getByTestId('billing-config-scroll');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(mockGetBillingConfigItems).toHaveBeenCalledTimes(2);
      expect(mockGetReceivedItemTemplates).toHaveBeenCalledTimes(2);
    });
  });

  it('reloads data when screen comes into focus', async () => {
    let focusListener: () => void;
    mockNavigation.addListener.mockImplementation((event, callback) => {
      if (event === 'focus') {
        focusListener = callback;
      }
      return jest.fn();
    });

    render(<BillingConfigScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(mockGetBillingConfigItems).toHaveBeenCalledTimes(1);
    });

    // Simulate screen focus
    act(() => {
      focusListener();
    });

    await waitFor(() => {
      expect(mockGetBillingConfigItems).toHaveBeenCalledTimes(2);
    });
  });
});