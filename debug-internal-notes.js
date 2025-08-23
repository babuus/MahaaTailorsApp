// Debug script to test internal notes data flow
// This script helps identify where the internal notes are getting lost

console.log('=== Internal Notes Debug Script ===');

// Test data that should be sent to backend
const testBillData = {
  id: 'test-bill-123',
  customerId: 'test-customer-456',
  billingDate: '2024-01-15',
  deliveryDate: '2024-01-20',
  deliveryStatus: 'pending',
  items: [
    {
      id: 'test-item-789',
      type: 'custom',
      name: 'Test Item',
      description: 'Test description',
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100,
      materialSource: 'customer',
      deliveryStatus: 'pending',
      internalNotes: 'This is a test internal note' // This should be saved
    }
  ],
  receivedItems: [],
  notes: 'Test bill notes'
};

console.log('1. Frontend sends this data to backend:');
console.log('   Item internalNotes:', testBillData.items[0].internalNotes);

// What backend should save to database
const backendItemRecord = {
  item_id: testBillData.items[0].id,
  bill_id: testBillData.id,
  name: testBillData.items[0].name,
  internal_notes: testBillData.items[0].internalNotes, // Should be saved as internal_notes
  // ... other fields
};

console.log('2. Backend should save to database:');
console.log('   internal_notes field:', backendItemRecord.internal_notes);

// What backend should return in API response
const apiResponseItem = {
  id: backendItemRecord.item_id,
  name: backendItemRecord.name,
  internalNotes: backendItemRecord.internal_notes, // Should be returned as internalNotes
  // ... other fields
};

console.log('3. Backend should return in API response:');
console.log('   internalNotes field:', apiResponseItem.internalNotes);

console.log('4. Frontend should receive and display:');
console.log('   item.internalNotes:', apiResponseItem.internalNotes);

console.log('\n=== Debugging Steps ===');
console.log('1. Check browser console for "Saving item with internal notes:" log');
console.log('2. Check browser console for "API getBillById - Backend response:" log');
console.log('3. Check browser console for "BillingItemPopup - Loading item data:" log');
console.log('4. Check backend CloudWatch logs for "DEBUG save_bill_items" entries');
console.log('5. Check backend CloudWatch logs for "DEBUG get_bill_by_id" entries');
console.log('6. Check DynamoDB BillItems table for internal_notes field');

console.log('\n=== Expected Data Flow ===');
console.log('Frontend BillingItemPopup → EditBillWizardScreen → API updateBill');
console.log('→ Backend save_bill_items → DynamoDB (internal_notes field)');
console.log('→ Backend get_bill_by_id → format_bill_items_for_response');
console.log('→ API getBillById → Frontend EditBillWizardScreen → BillingItemPopup');