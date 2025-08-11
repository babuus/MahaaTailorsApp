# Billing Items API Documentation

This document describes the new Billing Items API endpoints that allow you to manage individual billing items separately from bills.

## Overview

The new structure separates billing items from bills:
- **Bills Table**: Contains bill metadata (customer, dates, totals, payments, etc.)
- **BillItems Table**: Contains individual items with references to their parent bills

## API Endpoints

### 1. Get All Bill Items
**GET** `/bill-items`

Retrieve all billing items with optional filtering.

**Query Parameters:**
- `billId` (optional): Filter items by specific bill ID
- `type` (optional): Filter by item type (e.g., "custom", "template")
- `deliveryStatus` (optional): Filter by delivery status ("pending", "delivered", etc.)
- `limit` (optional): Maximum number of items to return (default: 100)

**Example Requests:**
```bash
# Get all items
GET /bill-items

# Get items for a specific bill
GET /bill-items?billId=bill-abc123

# Get items with specific delivery status
GET /bill-items?deliveryStatus=pending

# Get custom items with limit
GET /bill-items?type=custom&limit=50
```

**Response:**
```json
{
  "items": [
    {
      "id": "item-abc123",
      "billId": "bill-xyz789",
      "type": "custom",
      "name": "Custom Shirt",
      "description": "Blue cotton shirt with custom measurements",
      "quantity": 2,
      "unitPrice": 500.00,
      "totalPrice": 1000.00,
      "configItemId": null,
      "materialSource": "customer",
      "deliveryStatus": "pending",
      "createdAt": 1640995200,
      "updatedAt": 1640995200
    }
  ],
  "hasMore": false
}
```

### 2. Get Bill Item by ID
**GET** `/bill-items/{id}`

Retrieve a specific billing item by its ID.

**Path Parameters:**
- `id`: The unique item ID

**Example Request:**
```bash
GET /bill-items/item-abc123
```

**Response:**
```json
{
  "id": "item-abc123",
  "billId": "bill-xyz789",
  "type": "custom",
  "name": "Custom Shirt",
  "description": "Blue cotton shirt with custom measurements",
  "quantity": 2,
  "unitPrice": 500.00,
  "totalPrice": 1000.00,
  "configItemId": null,
  "materialSource": "customer",
  "deliveryStatus": "pending",
  "createdAt": 1640995200,
  "updatedAt": 1640995200
}
```

### 3. Update Bill Item
**PUT** `/bill-items/{id}`

Update a specific billing item.

**Path Parameters:**
- `id`: The unique item ID

**Request Body:**
```json
{
  "name": "Updated Shirt Name",
  "description": "Updated description",
  "quantity": 3,
  "unitPrice": 600.00,
  "deliveryStatus": "delivered",
  "materialSource": "shop"
}
```

**Response:**
```json
{
  "id": "item-abc123",
  "billId": "bill-xyz789",
  "type": "custom",
  "name": "Updated Shirt Name",
  "description": "Updated description",
  "quantity": 3,
  "unitPrice": 600.00,
  "totalPrice": 1800.00,
  "configItemId": null,
  "materialSource": "shop",
  "deliveryStatus": "delivered",
  "createdAt": 1640995200,
  "updatedAt": 1641081600
}
```

### 4. Delete Bill Item
**DELETE** `/bill-items/{id}`

Delete a specific billing item. This will also update the parent bill's total amount.

**Path Parameters:**
- `id`: The unique item ID

**Example Request:**
```bash
DELETE /bill-items/item-abc123
```

**Response:**
```json
{
  "message": "Bill item deleted successfully"
}
```



## Data Structure

### Bill Item Object
```json
{
  "id": "string",              // Unique item identifier
  "billId": "string",          // Reference to parent bill
  "type": "string",            // Item type (custom, template, etc.)
  "name": "string",            // Item name
  "description": "string",     // Item description
  "quantity": "number",        // Quantity of items
  "unitPrice": "number",       // Price per unit
  "totalPrice": "number",      // Total price (quantity × unitPrice)
  "configItemId": "string",    // Reference to config item (optional)
  "materialSource": "string",  // Source of material (customer, shop)
  "deliveryStatus": "string",  // Delivery status (pending, delivered, etc.)
  "createdAt": "number",       // Creation timestamp
  "updatedAt": "number"        // Last update timestamp
}
```

## Error Responses

All endpoints return standard HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing required parameters)
- `404`: Not Found (item doesn't exist)
- `500`: Internal Server Error

**Error Response Format:**
```json
{
  "error": "Error message describing what went wrong"
}
```

## Notes

1. **Backward Compatibility**: The existing bill APIs (`/bills`) continue to work unchanged. They now fetch items from the new BillItems table automatically.

2. **Automatic Calculations**: When you update or delete bill items, the parent bill's total amount and status are automatically recalculated.

3. **Performance**: The new structure provides better performance for bills with many items and enables more flexible querying of individual items.

4. **Scalability**: Each billing item is stored as an individual record, making it easier to query, analyze, and manage large numbers of items across multiple bills.