import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ReceivedItemsComponent } from '../ReceivedItemsComponent';
import { ReceivedItem, ReceivedItemTemplate } from '../../types';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock useFormValidation
jest.mock('../../hooks/useFormValidation', () => ({
    useFormValidation: jest.fn(() => ({
        data: {
            name: '',
            description: '',
            quantity: 1,
            receivedDate: '2024-01-15',
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

const mockReceivedItems: ReceivedItem[] = [
    {
        id: '1',
        name: 'Sample Blouse',
        description: 'Blue cotton blouse for reference',
        quantity: 1,
        receivedDate: '2024-01-10',
        status: 'received',
    },
    {
        id: '2',
        name: 'Fabric Material',
        description: 'Silk fabric for dress',
        quantity: 2,
        receivedDate: '2024-01-12',
        returnedDate: '2024-01-14',
        status: 'returned',
    },
];

const mockTemplates: ReceivedItemTemplate[] = [
    {
        id: 'template1',
        name: 'Sample Blouse',
        description: 'Reference blouse template',
        category: 'sample',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'template2',
        name: 'Fabric Material',
        description: 'Customer fabric template',
        category: 'material',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
    },
];

const defaultProps = {
    receivedItems: mockReceivedItems,
    onItemsChange: jest.fn(),
    editable: true,
};

describe('ReceivedItemsComponent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockApi.getReceivedItemTemplates.mockResolvedValue(mockTemplates);
    });

    describe('Rendering', () => {
        it('renders component with title', async () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            expect(screen.getByText('Items Received from Customer')).toBeTruthy();
            await waitFor(() => {
                expect(mockApi.getReceivedItemTemplates).toHaveBeenCalled();
            });
        });

        it('renders received items list', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            expect(screen.getByText('Sample Blouse')).toBeTruthy();
            expect(screen.getByText('Blue cotton blouse for reference')).toBeTruthy();
            expect(screen.getByText('Fabric Material')).toBeTruthy();
            expect(screen.getByText('Silk fabric for dress')).toBeTruthy();
        });

        it('shows status badges correctly', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            expect(screen.getByText('Received')).toBeTruthy();
            expect(screen.getByText('Returned')).toBeTruthy();
        });

        it('shows empty state when no items', () => {
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    receivedItems={[]}
                />
            );

            expect(screen.getByText('No items received from customer yet')).toBeTruthy();
            expect(screen.getByText('Add items using the button above or select from templates')).toBeTruthy();
        });

        it('hides add button when not editable', () => {
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    editable={false}
                />
            );

            expect(screen.queryByTestId('add-custom-received-item')).toBeNull();
        });
    });

    describe('Templates', () => {
        it('loads and displays templates', async () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('Quick Add from Templates:')).toBeTruthy();
            });

            expect(mockApi.getReceivedItemTemplates).toHaveBeenCalled();
        });

        it('adds item from template', async () => {
            const onItemsChange = jest.fn();
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    onItemsChange={onItemsChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByTestId('add-template-template1')).toBeTruthy();
            });

            fireEvent.press(screen.getByTestId('add-template-template1'));

            expect(onItemsChange).toHaveBeenCalledWith(
                expect.arrayContaining([
                    ...mockReceivedItems,
                    expect.objectContaining({
                        name: 'Sample Blouse',
                        description: 'Reference blouse template',
                        quantity: 1,
                        status: 'received',
                    }),
                ])
            );
        });

        it('handles template loading error gracefully', async () => {
            mockApi.getReceivedItemTemplates.mockRejectedValue(new Error('API Error'));

            render(<ReceivedItemsComponent {...defaultProps} />);

            await waitFor(() => {
                expect(mockApi.getReceivedItemTemplates).toHaveBeenCalled();
            });

            // Should not show templates section on error
            expect(screen.queryByText('Quick Add from Templates:')).toBeNull();
        });
    });

    describe('Add/Edit Form', () => {
        it('shows add form when add button is pressed', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            fireEvent.press(screen.getByTestId('add-custom-received-item'));

            expect(screen.getByText('Add Received Item')).toBeTruthy();
            expect(screen.getByTestId('received-item-name-input')).toBeTruthy();
            expect(screen.getByTestId('received-item-description-input')).toBeTruthy();
            expect(screen.getByTestId('received-item-quantity-input')).toBeTruthy();
            expect(screen.getByTestId('received-item-date-input')).toBeTruthy();
        });

        it('shows edit form when edit button is pressed', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            fireEvent.press(screen.getByTestId('edit-received-item-0'));

            expect(screen.getByText('Edit Received Item')).toBeTruthy();
        });

        it('closes form when cancel is pressed', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            fireEvent.press(screen.getByTestId('add-custom-received-item'));
            expect(screen.getByText('Add Received Item')).toBeTruthy();

            fireEvent.press(screen.getByTestId('cancel-add-item'));
            expect(screen.queryByText('Add Received Item')).toBeNull();
        });

        it('closes form when close button is pressed', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            fireEvent.press(screen.getByTestId('add-custom-received-item'));
            expect(screen.getByText('Add Received Item')).toBeTruthy();

            fireEvent.press(screen.getByTestId('close-add-form'));
            expect(screen.queryByText('Add Received Item')).toBeNull();
        });
    });

    describe('Item Actions', () => {
        it('marks item as returned', () => {
            const onItemsChange = jest.fn();
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    onItemsChange={onItemsChange}
                />
            );

            fireEvent.press(screen.getByTestId('return-item-0'));

            expect(Alert.alert).toHaveBeenCalledWith(
                'Mark as Returned',
                'Mark this item as returned to the customer?',
                expect.any(Array)
            );

            // Simulate pressing "Mark Returned"
            const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
            const markReturnedCallback = alertCall[2][1].onPress;
            markReturnedCallback();

            expect(onItemsChange).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '1',
                        status: 'returned',
                        returnedDate: expect.any(String),
                    }),
                ])
            );
        });

        it('marks returned item as received again', () => {
            const onItemsChange = jest.fn();
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    onItemsChange={onItemsChange}
                />
            );

            // Click on the returned item (index 1)
            fireEvent.press(screen.getByTestId('unreturned-item-1'));

            expect(onItemsChange).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '2',
                        status: 'received',
                        returnedDate: undefined,
                    }),
                ])
            );
        });

        it('removes item with confirmation', () => {
            const onItemsChange = jest.fn();
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    onItemsChange={onItemsChange}
                />
            );

            fireEvent.press(screen.getByTestId('remove-received-item-0'));

            expect(Alert.alert).toHaveBeenCalledWith(
                'Remove Item',
                'Are you sure you want to remove this received item?',
                expect.any(Array)
            );

            // Simulate pressing "Remove"
            const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
            const removeCallback = alertCall[2][1].onPress;
            removeCallback();

            expect(onItemsChange).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: '2' }),
                ])
            );
            expect(onItemsChange).toHaveBeenCalledWith(
                expect.not.arrayContaining([
                    expect.objectContaining({ id: '1' }),
                ])
            );
        });
    });

    describe('Visual States', () => {
        it('applies returned item styling', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            // The returned item should have different styling
            const returnedItemCard = screen.getByText('Fabric Material').parent?.parent;
            expect(returnedItemCard).toHaveStyle({ opacity: 0.7 });
        });

        it('shows correct dates for items', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            expect(screen.getByText('Received: 1/10/2024')).toBeTruthy();
            expect(screen.getByText('Received: 1/12/2024')).toBeTruthy();
            expect(screen.getByText('Returned: 1/14/2024')).toBeTruthy();
        });

        it('shows quantity information', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            expect(screen.getByText('Quantity: 1')).toBeTruthy();
            expect(screen.getByText('Quantity: 2')).toBeTruthy();
        });
    });

    describe('Accessibility', () => {
        it('has proper test IDs for all interactive elements', () => {
            render(<ReceivedItemsComponent {...defaultProps} />);

            expect(screen.getByTestId('received-items-component')).toBeTruthy();
            expect(screen.getByTestId('add-custom-received-item')).toBeTruthy();
            expect(screen.getByTestId('edit-received-item-0')).toBeTruthy();
            expect(screen.getByTestId('return-item-0')).toBeTruthy();
            expect(screen.getByTestId('unreturned-item-1')).toBeTruthy();
            expect(screen.getByTestId('remove-received-item-0')).toBeTruthy();
        });

        it('supports custom testID prop', () => {
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    testID="custom-received-items"
                />
            );

            expect(screen.getByTestId('custom-received-items')).toBeTruthy();
        });
    });

    describe('Integration', () => {
        it('works with billId prop', () => {
            render(
                <ReceivedItemsComponent
                    {...defaultProps}
                    billId="bill123"
                />
            );

            expect(screen.getByText('Items Received from Customer')).toBeTruthy();
        });

        it('handles empty templates array', async () => {
            mockApi.getReceivedItemTemplates.mockResolvedValue([]);

            render(<ReceivedItemsComponent {...defaultProps} />);

            await waitFor(() => {
                expect(mockApi.getReceivedItemTemplates).toHaveBeenCalled();
            });

            expect(screen.queryByText('Quick Add from Templates:')).toBeNull();
        });

        it('filters inactive templates', async () => {
            const templatesWithInactive = [
                ...mockTemplates,
                {
                    id: 'template3',
                    name: 'Inactive Template',
                    description: 'Should not appear',
                    category: 'other' as const,
                    isActive: false,
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
            ];

            mockApi.getReceivedItemTemplates.mockResolvedValue(templatesWithInactive);

            render(<ReceivedItemsComponent {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('Quick Add from Templates:')).toBeTruthy();
            });

            expect(screen.queryByText('Inactive Template')).toBeNull();
            expect(screen.getByText('Sample Blouse')).toBeTruthy();
            expect(screen.getByText('Fabric Material')).toBeTruthy();
        });
    });
});