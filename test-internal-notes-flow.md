# Internal Notes Testing Flow

## Prerequisites
1. ✅ Backend changes deployed (run `./deploy-backend-fix.sh`)
2. ✅ Frontend debugging logs added
3. ✅ App running in development mode

## Test Scenario: Save and Retrieve Internal Notes

### Step 1: Save Internal Notes
1. **Open the app** and navigate to any existing bill
2. **Edit a bill item** (tap on an item in the bill)
3. **Add internal notes**: Scroll down to "Internal Notes (Staff Only)" field
4. **Enter test text**: "Test internal notes - should persist"
5. **Save the item** (tap Save/Add Item button)
6. **Check console log**: Should see `"Saving item with internal notes: Test internal notes - should persist"`
7. **Save the bill** (tap Save Changes button)
8. **Check console log**: Should see `"EditBillWizard - Submitting bill data:"` with internal notes

### Step 2: Verify Backend Processing
1. **Check CloudWatch logs** for the billing Lambda function
2. **Look for logs**: `"DEBUG save_bill_items - Item [id]: internalNotes='Test internal notes - should persist'"`
3. **Verify database**: Check DynamoDB BillItems table for `internal_notes` field

### Step 3: Retrieve Internal Notes
1. **Close the bill** (go back to bills list)
2. **Reopen the same bill**
3. **Check console log**: Should see `"API getBillById - Backend response:"` with internal notes
4. **Check console log**: Should see `"EditBillWizard - Loading bill data:"` with internal notes
5. **Edit the same item again**
6. **Check console log**: Should see `"BillingItemPopup - Loading item data:"` with internal notes
7. **Verify UI**: The internal notes field should show "Test internal notes - should persist"

## Expected Console Logs (in order)

### When Saving:
```
Saving item with internal notes: Test internal notes - should persist
EditBillWizard - Submitting bill data: {
  billId: "bill-123",
  itemsCount: 1,
  firstItemInternalNotes: "Test internal notes - should persist",
  allItemsInternalNotes: [
    {
      id: "item-456",
      name: "Test Item",
      internalNotes: "Test internal notes - should persist"
    }
  ]
}
```

### When Loading:
```
API getBillById - Backend response: {
  billId: "bill-123",
  itemsCount: 1,
  firstItem: {
    id: "item-456",
    name: "Test Item",
    internalNotes: "Test internal notes - should persist"
  },
  firstItemInternalNotes: "Test internal notes - should persist"
}

EditBillWizard - Loading bill data: {
  billId: "bill-123",
  itemsCount: 1,
  firstItem: {
    id: "item-456",
    name: "Test Item",
    internalNotes: "Test internal notes - should persist"
  },
  firstItemInternalNotes: "Test internal notes - should persist"
}

BillingItemPopup - Loading item data: {
  itemId: "item-456",
  itemName: "Test Item",
  internalNotes: "Test internal notes - should persist",
  hasInternalNotes: true
}
```

## Troubleshooting

### If internal notes don't save:
1. **Check backend deployment**: Ensure Lambda functions are updated
2. **Check console logs**: Look for "Saving item with internal notes:" message
3. **Check API payload**: Look for "EditBillWizard - Submitting bill data:" message
4. **Check CloudWatch**: Look for "DEBUG save_bill_items" messages

### If internal notes don't load:
1. **Check database**: Verify `internal_notes` field exists in DynamoDB
2. **Check API response**: Look for "API getBillById - Backend response:" message
3. **Check data loading**: Look for "EditBillWizard - Loading bill data:" message
4. **Check item loading**: Look for "BillingItemPopup - Loading item data:" message

### If UI doesn't show internal notes:
1. **Check item data**: Verify item.internalNotes is not empty
2. **Check component rendering**: Ensure BillingItemPopup renders internal notes field
3. **Check form state**: Verify formData.internalNotes is populated

## Success Criteria
- ✅ Internal notes can be entered and saved
- ✅ Internal notes persist after closing and reopening bill
- ✅ Internal notes appear in edit mode
- ✅ Console logs show data flow at each step
- ✅ Backend logs show successful save/retrieve operations
- ✅ Database contains internal_notes field with correct value

## Status After Testing
- [ ] Backend deployed successfully
- [ ] Save flow working (notes saved to database)
- [ ] Retrieve flow working (notes loaded from database)
- [ ] UI flow working (notes displayed in interface)
- [ ] End-to-end persistence confirmed