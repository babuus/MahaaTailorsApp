import os
import json
import boto3
from botocore.exceptions import ClientError
import logging
from datetime import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Attr, Key

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return json.JSONEncoder.default(self, obj)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

REGION = os.environ.get("AWS_REGION", "ap-south-1")
BILLS_TABLE_NAME = os.environ.get("BILLS_TABLE_NAME", "Bills")
CUSTOMERS_TABLE_NAME = os.environ.get("CUSTOMERS_TABLE_NAME", "Customers")
BILLING_CONFIG_ITEMS_TABLE_NAME = os.environ.get("BILLING_CONFIG_ITEMS_TABLE_NAME", "BillingConfigItems")
RECEIVED_ITEM_TEMPLATES_TABLE_NAME = os.environ.get("RECEIVED_ITEM_TEMPLATES_TABLE_NAME", "ReceivedItemTemplates")
BILL_ITEMS_TABLE_NAME = os.environ.get("BILL_ITEMS_TABLE_NAME", "BillItems")

print(f"DEBUG: Using REGION: {REGION}")
print(f"DEBUG: Using BILLS_TABLE_NAME: {BILLS_TABLE_NAME}")
print(f"DEBUG: Using CUSTOMERS_TABLE_NAME: {CUSTOMERS_TABLE_NAME}")
print(f"DEBUG: Using BILLING_CONFIG_ITEMS_TABLE_NAME: {BILLING_CONFIG_ITEMS_TABLE_NAME}")
print(f"DEBUG: Using RECEIVED_ITEM_TEMPLATES_TABLE_NAME: {RECEIVED_ITEM_TEMPLATES_TABLE_NAME}")
print(f"DEBUG: Using BILL_ITEMS_TABLE_NAME: {BILL_ITEMS_TABLE_NAME}")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
bills_table = dynamodb.Table(BILLS_TABLE_NAME)
customers_table = dynamodb.Table(CUSTOMERS_TABLE_NAME)
billing_config_items_table = dynamodb.Table(BILLING_CONFIG_ITEMS_TABLE_NAME)
received_item_templates_table = dynamodb.Table(RECEIVED_ITEM_TEMPLATES_TABLE_NAME)
bill_items_table = dynamodb.Table(BILL_ITEMS_TABLE_NAME)

def handle_error(e, function_name):
    logger.error(f"Error in {function_name}: {e}")
    return {
        "statusCode": 500,
        "body": json.dumps({"error": f"Error in {function_name}: {str(e)}"}),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    }

def handle_options(event, context):
    return {
        "statusCode": 204,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    }

# Helper functions for managing bill items in separate table
def get_bill_items(bill_id):
    """Retrieve all items for a specific bill from the BillItems table"""
    try:
        response = bill_items_table.query(
            IndexName="BillIdIndex",
            KeyConditionExpression=Key("bill_id").eq(bill_id)
        )
        return response.get("Items", [])
    except Exception as e:
        logger.error(f"Error fetching bill items for bill {bill_id}: {e}")
        return []

def save_bill_items(bill_id, items):
    """Save bill items to the BillItems table"""
    try:
        # First, delete existing items for this bill
        existing_items = get_bill_items(bill_id)
        for item in existing_items:
            bill_items_table.delete_item(Key={"item_id": item["item_id"]})
        
        # Then save new items
        for item in items:
            item_record = {
                "item_id": item["id"],
                "bill_id": bill_id,
                "type": item.get("type", "custom"),
                "name": item.get("name"),
                "description": item.get("description", ""),
                "quantity": item.get("quantity", 1),
                "unit_price": Decimal(str(item.get("unitPrice", 0))),
                "total_price": Decimal(str(item.get("totalPrice", 0))),
                "config_item_id": item.get("configItemId"),
                "material_source": item.get("materialSource", "customer"),
                "delivery_status": item.get("deliveryStatus", "pending"),
                "created_at": int(datetime.now().timestamp()),
                "updated_at": int(datetime.now().timestamp())
            }
            bill_items_table.put_item(Item=item_record)
        
        logger.info(f"Saved {len(items)} items for bill {bill_id}")
    except Exception as e:
        logger.error(f"Error saving bill items for bill {bill_id}: {e}")
        raise e

def delete_bill_items(bill_id):
    """Delete all items for a specific bill from the BillItems table"""
    try:
        existing_items = get_bill_items(bill_id)
        for item in existing_items:
            bill_items_table.delete_item(Key={"item_id": item["item_id"]})
        logger.info(f"Deleted {len(existing_items)} items for bill {bill_id}")
    except Exception as e:
        logger.error(f"Error deleting bill items for bill {bill_id}: {e}")
        raise e

def format_bill_items_for_response(bill_items):
    """Convert bill items from database format to API response format"""
    formatted_items = []
    for item in bill_items:
        formatted_item = {
            "id": item["item_id"],
            "billId": item.get("bill_id"),
            "type": item.get("type", "custom"),
            "name": item.get("name"),
            "description": item.get("description", ""),
            "quantity": int(item.get("quantity", 1)),
            "unitPrice": float(item.get("unit_price", 0)) if isinstance(item.get("unit_price"), Decimal) else item.get("unit_price", 0),
            "totalPrice": float(item.get("total_price", 0)) if isinstance(item.get("total_price"), Decimal) else item.get("total_price", 0),
            "configItemId": item.get("config_item_id"),
            "materialSource": item.get("material_source", "customer"),
            "deliveryStatus": item.get("delivery_status", "pending"),
            "createdAt": item.get("created_at"),
            "updatedAt": item.get("updated_at")
        }
        formatted_items.append(formatted_item)
    return formatted_items

# New API functions for billing items
def get_all_bill_items(event, context):
    """Get all billing items with optional filtering"""
    try:
        query_params = event.get("queryStringParameters", {}) or {}
        bill_id = query_params.get("billId")
        item_type = query_params.get("type")
        delivery_status = query_params.get("deliveryStatus")
        limit = int(query_params.get("limit", 100))

        if bill_id:
            # Get items for specific bill
            response = bill_items_table.query(
                IndexName="BillIdIndex",
                KeyConditionExpression=Key("bill_id").eq(bill_id),
                Limit=limit
            )
        else:
            # Get all items with optional filtering
            scan_kwargs = {"Limit": limit}
            
            filter_expressions = []
            if item_type:
                filter_expressions.append(Attr("type").eq(item_type))
            if delivery_status:
                filter_expressions.append(Attr("delivery_status").eq(delivery_status))
            
            if filter_expressions:
                filter_expr = filter_expressions[0]
                for expr in filter_expressions[1:]:
                    filter_expr = filter_expr & expr
                scan_kwargs["FilterExpression"] = filter_expr
            
            response = bill_items_table.scan(**scan_kwargs)

        items = response.get("Items", [])
        formatted_items = format_bill_items_for_response(items)

        logger.info(f"Retrieved {len(formatted_items)} bill items")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "items": formatted_items,
                "hasMore": len(items) == limit
            }, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_all_bill_items")

def get_bill_items_by_bill_id(event, context):
    """Get all billing items for a specific bill"""
    try:
        bill_id = event["pathParameters"]["billId"]
        if not bill_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID is required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Get items using the helper function
        bill_items = get_bill_items(bill_id)
        formatted_items = format_bill_items_for_response(bill_items)

        logger.info(f"Fetched {len(formatted_items)} items for bill {bill_id}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "billId": bill_id,
                "items": formatted_items,
                "totalItems": len(formatted_items)
            }, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_bill_items_by_bill_id")

def get_bill_item_by_id(event, context):
    """Get a specific billing item by its ID"""
    try:
        item_id = event["pathParameters"]["id"]
        if not item_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Item ID is required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        response = bill_items_table.get_item(Key={"item_id": item_id})
        item = response.get("Item")
        
        if not item:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill item not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        formatted_items = format_bill_items_for_response([item])
        formatted_item = formatted_items[0] if formatted_items else {}

        return {
            "statusCode": 200,
            "body": json.dumps(formatted_item, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_bill_item_by_id")

def update_bill_item(event, context):
    """Update a specific billing item"""
    try:
        item_id = event["pathParameters"]["id"]
        body = json.loads(event.get("body", "{}"))
        
        if not item_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Item ID is required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Check if item exists
        response = bill_items_table.get_item(Key={"item_id": item_id})
        if not response.get("Item"):
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill item not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Build update expression
        update_expression = "SET updated_at = :updatedAt"
        expression_attribute_values = {":updatedAt": int(datetime.now().timestamp())}
        
        if body.get("name"):
            update_expression += ", #name = :name"
            expression_attribute_values[":name"] = body["name"]
        
        if body.get("description") is not None:
            update_expression += ", description = :description"
            expression_attribute_values[":description"] = body["description"]
        
        if body.get("quantity"):
            update_expression += ", quantity = :quantity"
            expression_attribute_values[":quantity"] = int(body["quantity"])
        
        if body.get("unitPrice") is not None:
            unit_price = Decimal(str(body["unitPrice"]))
            quantity = int(body.get("quantity", response["Item"].get("quantity", 1)))
            total_price = unit_price * quantity
            
            update_expression += ", unit_price = :unitPrice, total_price = :totalPrice"
            expression_attribute_values[":unitPrice"] = unit_price
            expression_attribute_values[":totalPrice"] = total_price
        
        if body.get("deliveryStatus"):
            update_expression += ", delivery_status = :deliveryStatus"
            expression_attribute_values[":deliveryStatus"] = body["deliveryStatus"]
        
        if body.get("materialSource"):
            update_expression += ", material_source = :materialSource"
            expression_attribute_values[":materialSource"] = body["materialSource"]

        expression_attribute_names = {}
        if body.get("name"):
            expression_attribute_names["#name"] = "name"

        # Update the item
        update_kwargs = {
            "Key": {"item_id": item_id},
            "UpdateExpression": update_expression,
            "ExpressionAttributeValues": expression_attribute_values,
            "ReturnValues": "ALL_NEW"
        }
        
        if expression_attribute_names:
            update_kwargs["ExpressionAttributeNames"] = expression_attribute_names

        response = bill_items_table.update_item(**update_kwargs)
        updated_item = response.get("Attributes")

        # Format response
        formatted_items = format_bill_items_for_response([updated_item])
        formatted_item = formatted_items[0] if formatted_items else {}

        logger.info(f"Updated bill item: {item_id}")
        return {
            "statusCode": 200,
            "body": json.dumps(formatted_item, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "update_bill_item")

def delete_bill_item(event, context):
    """Delete a specific billing item"""
    try:
        item_id = event["pathParameters"]["id"]
        if not item_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Item ID is required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Get the item first to get bill_id for recalculation
        response = bill_items_table.get_item(Key={"item_id": item_id})
        item = response.get("Item")
        
        if not item:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill item not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        bill_id = item["bill_id"]
        item_total = float(item.get("total_price", 0))

        # Delete the item
        bill_items_table.delete_item(Key={"item_id": item_id})

        # Update the bill's total amount
        bill_response = bills_table.get_item(Key={"bill_id": bill_id})
        if bill_response.get("Item"):
            bill = bill_response["Item"]
            current_total = float(bill.get("total_amount", 0))
            new_total = max(0, current_total - item_total)
            
            # Recalculate outstanding amount
            paid_amount = float(bill.get("paid_amount", 0))
            new_outstanding = new_total - paid_amount
            
            # Update status
            if new_outstanding <= 0:
                status = "fully_paid"
            elif paid_amount > 0:
                status = "partially_paid"
            else:
                status = "unpaid"

            bills_table.update_item(
                Key={"bill_id": bill_id},
                UpdateExpression="SET total_amount = :totalAmount, outstanding_amount = :outstandingAmount, #s = :status, updated_at = :updatedAt",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":totalAmount": Decimal(str(new_total)),
                    ":outstandingAmount": Decimal(str(new_outstanding)),
                    ":status": status,
                    ":updatedAt": int(datetime.now().timestamp())
                }
            )

        logger.info(f"Deleted bill item: {item_id}")
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Bill item deleted successfully"}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "delete_bill_item")

def get_bills(event, context):
    try:
        query_params = event.get("queryStringParameters", {}) or {}
        customer_id = query_params.get("customerId")
        status = query_params.get("status")
        start_date = query_params.get("startDate")
        end_date = query_params.get("endDate")
        search_text = query_params.get("searchText")
        limit = int(query_params.get("limit", 50))

        scan_kwargs = {"Limit": limit}
        
        # Build filter expression
        filter_expressions = []
        
        if customer_id:
            filter_expressions.append(Attr("customer_id").eq(customer_id))
        
        if status:
            filter_expressions.append(Attr("status").eq(status))
            
        if start_date and end_date:
            filter_expressions.append(Attr("billing_date").between(start_date, end_date))
        elif start_date:
            filter_expressions.append(Attr("billing_date").gte(start_date))
        elif end_date:
            filter_expressions.append(Attr("billing_date").lte(end_date))
            
        if search_text:
            filter_expressions.append(
                Attr("bill_number").contains(search_text) |
                Attr("notes").contains(search_text)
            )
        
        if filter_expressions:
            filter_expr = filter_expressions[0]
            for expr in filter_expressions[1:]:
                filter_expr = filter_expr & expr
            scan_kwargs["FilterExpression"] = filter_expr

        response = bills_table.scan(**scan_kwargs)
        
        bills = []
        for item in response.get("Items", []):
            # Recalculate amounts to ensure consistency
            total_amount = float(item["total_amount"]) if isinstance(item["total_amount"], Decimal) else item["total_amount"]
            payments = item.get("payments", [])
            
            # Calculate paid amount from payments
            paid_amount = sum(float(payment.get("amount", 0)) for payment in payments)
            outstanding_amount = total_amount - paid_amount
            
            # Determine status based on calculated amounts
            if outstanding_amount <= 0:
                status = "fully_paid"
            elif paid_amount > 0:
                status = "partially_paid"
            else:
                status = "unpaid"
            
            # Get items from separate BillItems table
            bill_items = get_bill_items(item["bill_id"])
            formatted_items = format_bill_items_for_response(bill_items)
            
            # Use items from separate table if available, otherwise fall back to legacy items
            items_to_use = formatted_items if formatted_items else item.get("items", [])
            
            bill = {
                "id": item["bill_id"],
                "customerId": item["customer_id"],
                "billNumber": item.get("bill_number", ""),
                "billingDate": item["billing_date"],
                "deliveryDate": item["delivery_date"],
                "deliveryStatus": item.get("delivery_status", "pending"),
                "items": items_to_use,
                "receivedItems": item.get("received_items", []),
                "totalAmount": total_amount,
                "paidAmount": paid_amount,
                "outstandingAmount": outstanding_amount,
                "status": status,
                "payments": payments,
                "notes": item.get("notes", ""),
                "createdAt": item.get("created_at"),
                "updatedAt": item.get("updated_at"),
            }
            bills.append(bill)

        logger.info(f"Fetched {len(bills)} bills")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "bills": bills,
                "hasMore": len(bills) == limit
            }, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_bills")

def get_bill_by_id(event, context):
    try:
        bill_id = event["pathParameters"]["id"]
        if not bill_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID is required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        response = bills_table.get_item(Key={"bill_id": bill_id})
        bill_item = response.get("Item")
        
        if not bill_item:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Recalculate amounts to ensure consistency
        total_amount = float(bill_item["total_amount"]) if isinstance(bill_item["total_amount"], Decimal) else bill_item["total_amount"]
        payments = bill_item.get("payments", [])
        
        # Calculate paid amount from payments
        paid_amount = sum(float(payment.get("amount", 0)) for payment in payments)
        outstanding_amount = total_amount - paid_amount
        
        # Determine status based on calculated amounts
        if outstanding_amount <= 0:
            status = "fully_paid"
        elif paid_amount > 0:
            status = "partially_paid"
        else:
            status = "unpaid"
        
        logger.info(f"DEBUG: Bill {bill_item['bill_id']} - Total: {total_amount}, Paid: {paid_amount}, Outstanding: {outstanding_amount}, Status: {status}")

        # Get items from separate BillItems table
        bill_items = get_bill_items(bill_item["bill_id"])
        formatted_items = format_bill_items_for_response(bill_items)
        
        # Use items from separate table if available, otherwise fall back to legacy items
        items_to_use = formatted_items if formatted_items else bill_item.get("items", [])

        bill = {
            "id": bill_item["bill_id"],
            "customerId": bill_item["customer_id"],
            "billNumber": bill_item.get("bill_number", ""),
            "billingDate": bill_item["billing_date"],
            "deliveryDate": bill_item["delivery_date"],
            "deliveryStatus": bill_item.get("delivery_status", "pending"),
            "items": items_to_use,
            "receivedItems": bill_item.get("received_items", []),
            "totalAmount": total_amount,
            "paidAmount": paid_amount,
            "outstandingAmount": outstanding_amount,
            "status": status,
            "payments": payments,
            "notes": bill_item.get("notes", ""),
            "createdAt": bill_item.get("created_at"),
            "updatedAt": bill_item.get("updated_at"),
        }

        return {
            "statusCode": 200,
            "body": json.dumps(bill, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_bill_by_id")

def add_bill(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        customer_id = body.get("customerId")
        billing_date = body.get("billingDate")
        delivery_date = body.get("deliveryDate")
        delivery_status = body.get("deliveryStatus", "pending")  # Add delivery status support
        items = body.get("items", [])
        received_items = body.get("receivedItems", [])
        payments = body.get("payments", [])  # Add support for payments during creation
        notes = body.get("notes", "")

        if not customer_id or not billing_date or not delivery_date or not items:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer ID, billing date, delivery date, and items are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Generate unique bill ID and bill number
        bill_id = f"bill-{os.urandom(16).hex()}"
        bill_number = f"B{int(datetime.now().timestamp())}"
        now = int(datetime.now().timestamp())

        # Calculate total amount from items
        total_amount = Decimal("0")
        processed_items = []
        for item in items:
            quantity = Decimal(str(item.get("quantity", 1)))
            unit_price = Decimal(str(item.get("unitPrice", 0)))
            item_total = quantity * unit_price
            processed_item = {
                "id": f"item-{os.urandom(8).hex()}",
                "type": item.get("type", "custom"),
                "name": item.get("name"),
                "description": item.get("description", ""),
                "quantity": int(item.get("quantity", 1)),
                "unitPrice": unit_price,
                "totalPrice": item_total,
                "configItemId": item.get("configItemId"),
                "materialSource": item.get("materialSource", "customer"),
                "deliveryStatus": item.get("deliveryStatus", "pending")
            }
            processed_items.append(processed_item)
            total_amount += item_total

        # Process received items
        processed_received_items = []
        for received_item in received_items:
            processed_received_item = {
                "id": f"received-{os.urandom(8).hex()}",
                "name": received_item.get("name"),
                "description": received_item.get("description", ""),
                "quantity": int(received_item.get("quantity", 1)),
                "receivedDate": received_item.get("receivedDate"),
                "status": "received"
            }
            processed_received_items.append(processed_received_item)

        # Process payments if provided
        processed_payments = []
        paid_amount = Decimal("0")
        
        for payment in payments:
            payment_amount = Decimal(str(payment.get("amount", 0)))
            
            # Validate payment amount
            if payment_amount <= 0:
                continue
                
            # Validate payment doesn't exceed total
            if paid_amount + payment_amount > total_amount:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "Total payment amount cannot exceed bill total."}),
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "*",
                        "Access-Control-Allow-Headers": "*",
                    },
                }
            
            processed_payment = {
                "id": f"payment-{os.urandom(8).hex()}",
                "amount": payment_amount,
                "paymentDate": payment.get("paymentDate", billing_date),
                "paymentMethod": payment.get("paymentMethod", "cash"),
                "notes": payment.get("notes", ""),
                "createdAt": now
            }
            processed_payments.append(processed_payment)
            paid_amount += payment_amount

        # Calculate outstanding amount and status
        outstanding_amount = total_amount - paid_amount
        
        if outstanding_amount <= 0:
            status = "fully_paid"
        elif paid_amount > 0:
            status = "partially_paid"
        else:
            status = "unpaid"

        # Save bill without items (items will be stored separately)
        bill_item = {
            "bill_id": bill_id,
            "customer_id": customer_id,
            "bill_number": bill_number,
            "billing_date": billing_date,
            "delivery_date": delivery_date,
            "delivery_status": delivery_status,
            "received_items": processed_received_items,
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "outstanding_amount": outstanding_amount,
            "status": status,
            "payments": processed_payments,
            "notes": notes,
            "created_at": now,
            "updated_at": now,
        }

        bills_table.put_item(Item=bill_item)
        
        # Save items to separate BillItems table
        save_bill_items(bill_id, processed_items)

        # Transform response to match frontend expectations
        response_bill = {
            "id": bill_id,
            "customerId": customer_id,
            "billNumber": bill_number,
            "billingDate": billing_date,
            "deliveryDate": delivery_date,
            "deliveryStatus": delivery_status,
            "items": processed_items,
            "receivedItems": processed_received_items,
            "totalAmount": float(total_amount),
            "paidAmount": float(paid_amount),
            "outstandingAmount": float(outstanding_amount),
            "status": status,
            "payments": processed_payments,
            "notes": notes,
            "createdAt": now,
            "updatedAt": now,
        }

        logger.info(f"Added bill: {bill_id}")
        return {
            "statusCode": 200,
            "body": json.dumps(response_bill, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "add_bill")

def update_bill(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        bill_id = event["pathParameters"]["id"]
        customer_id = body.get("customerId")
        billing_date = body.get("billingDate")
        delivery_date = body.get("deliveryDate")
        delivery_status = body.get("deliveryStatus", "pending")  # Add delivery status support
        items = body.get("items", [])
        received_items = body.get("receivedItems", [])
        notes = body.get("notes", "")

        if not bill_id or not customer_id or not billing_date or not delivery_date or not items:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID, customer ID, billing date, delivery date, and items are required for update."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Calculate total amount from items
        total_amount = Decimal("0")
        processed_items = []
        for item in items:
            quantity = Decimal(str(item.get("quantity", 1)))
            unit_price = Decimal(str(item.get("unitPrice", 0)))
            item_total = quantity * unit_price
            processed_item = {
                "id": item.get("id", f"item-{os.urandom(8).hex()}"),
                "type": item.get("type", "custom"),
                "name": item.get("name"),
                "description": item.get("description", ""),
                "quantity": int(item.get("quantity", 1)),
                "unitPrice": unit_price,
                "totalPrice": item_total,
                "configItemId": item.get("configItemId"),
                "materialSource": item.get("materialSource", "customer"),
                "deliveryStatus": item.get("deliveryStatus", "pending")
            }
            processed_items.append(processed_item)
            total_amount += item_total

        # Process received items
        processed_received_items = []
        for received_item in received_items:
            processed_received_item = {
                "id": received_item.get("id", f"received-{os.urandom(8).hex()}"),
                "name": received_item.get("name"),
                "description": received_item.get("description", ""),
                "quantity": int(received_item.get("quantity", 1)),
                "receivedDate": received_item.get("receivedDate"),
                "status": received_item.get("status", "received")
            }
            processed_received_items.append(processed_received_item)

        now = int(datetime.now().timestamp())

        # Update outstanding amount based on new total and existing payments
        response = bills_table.get_item(Key={"bill_id": bill_id})
        existing_bill = response.get("Item")
        if not existing_bill:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        paid_amount = Decimal(str(existing_bill.get("paid_amount", 0)))
        outstanding_amount = total_amount - paid_amount
        
        # Determine status based on payment
        if outstanding_amount <= 0:
            status = "fully_paid"
        elif paid_amount > 0:
            status = "partially_paid"
        else:
            status = "unpaid"

        # Update bill without items (items will be stored separately)
        update_expression = "SET customer_id = :customerId, billing_date = :billingDate, delivery_date = :deliveryDate, delivery_status = :deliveryStatus, received_items = :receivedItems, total_amount = :totalAmount, outstanding_amount = :outstandingAmount, #s = :status, notes = :notes, updated_at = :updatedAt"
        expression_attribute_names = {"#s": "status"}
        expression_attribute_values = {
            ":customerId": customer_id,
            ":billingDate": billing_date,
            ":deliveryDate": delivery_date,
            ":deliveryStatus": delivery_status,
            ":receivedItems": processed_received_items,
            ":totalAmount": Decimal(str(total_amount)),
            ":outstandingAmount": Decimal(str(outstanding_amount)),
            ":status": status,
            ":notes": notes,
            ":updatedAt": now,
        }

        response = bills_table.update_item(
            Key={"bill_id": bill_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
        )

        updated_item = response.get("Attributes")
        
        # Update items in separate BillItems table
        save_bill_items(bill_id, processed_items)
        
        # Transform response to match frontend expectations (same as add_bill)
        response_bill = {
            "id": updated_item["bill_id"],
            "customerId": updated_item["customer_id"],
            "billNumber": updated_item.get("bill_number", ""),
            "billingDate": updated_item["billing_date"],
            "deliveryDate": updated_item["delivery_date"],
            "deliveryStatus": updated_item.get("delivery_status", "pending"),
            "items": processed_items,
            "receivedItems": updated_item.get("received_items", []),
            "totalAmount": float(updated_item["total_amount"]) if isinstance(updated_item["total_amount"], Decimal) else updated_item["total_amount"],
            "paidAmount": float(updated_item.get("paid_amount", 0)) if isinstance(updated_item.get("paid_amount", 0), Decimal) else updated_item.get("paid_amount", 0),
            "outstandingAmount": float(updated_item.get("outstanding_amount", 0)) if isinstance(updated_item.get("outstanding_amount", 0), Decimal) else updated_item.get("outstanding_amount", 0),
            "status": updated_item.get("status", "unpaid"),
            "payments": updated_item.get("payments", []),
            "notes": updated_item.get("notes", ""),
            "createdAt": updated_item.get("created_at"),
            "updatedAt": updated_item.get("updated_at"),
        }
        
        logger.info(f"Updated bill: {updated_item['bill_id']}")
        return {
            "statusCode": 200,
            "body": json.dumps(response_bill, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except ClientError as e:
        if e.response["Error"]["Code"] == "ValidationException" and "The provided key element does not match the schema" in str(e):
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }
        return handle_error(e, "update_bill")
    except Exception as e:
        return handle_error(e, "update_bill")

def delete_bill(event, context):
    try:
        bill_id = event["pathParameters"]["id"]
        if not bill_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID is required for deletion."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Delete associated bill items first
        delete_bill_items(bill_id)
        
        # Then delete the bill
        bills_table.delete_item(Key={"bill_id": bill_id})

        logger.info(f"Deleted bill with ID: {bill_id}")
        return {
            "statusCode": 200,
            "body": json.dumps("Bill deleted successfully!"),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "delete_bill")

def get_customer_measurements(event, context):
    try:
        customer_id = event["pathParameters"]["id"]
        if not customer_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer ID is required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        response = customers_table.get_item(Key={"customer_id": customer_id})
        customer = response.get("Item")

        if not customer:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Customer not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        measurements = customer.get("measurements", {})

        logger.info(f"Fetched measurements for customer {customer_id}: {measurements}")
        return {
            "statusCode": 200,
            "body": json.dumps(measurements),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_customer_measurements")

def save_customer_measurement(event, context):
    try:
        customer_id = event["pathParameters"]["id"]
        body = json.loads(event.get("body", "{}"))
        garment_type = body.get("garmentType")
        measurements = body.get("measurements")

        if not customer_id or not garment_type or not measurements:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer ID, garment type, and measurements are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = boto3.dynamodb.types.Decimal(str(int(os.urandom(4).hex(), 16)))

        # Get existing customer to update measurements
        response = customers_table.get_item(Key={"customer_id": customer_id})
        customer = response.get("Item")

        if not customer:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Customer not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        customer_measurements = customer.get("measurements", {})
        customer_measurements[garment_type] = measurements

        update_expression = "SET measurements = :measurements, updated_at = :updatedAt"
        expression_attribute_values = {
            ":measurements": customer_measurements,
            ":updatedAt": now,
        }

        customers_table.update_item(
            Key={"customer_id": customer_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
        )

        logger.info(f"Saved measurements for customer {customer_id}, garment type {garment_type}")
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Measurements saved successfully!"}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "save_customer_measurement")

# Payment Management Functions
def add_payment(event, context):
    try:
        bill_id = event["pathParameters"]["id"]
        body = json.loads(event.get("body", "{}"))
        amount = body.get("amount")
        payment_date = body.get("paymentDate")
        payment_method = body.get("paymentMethod")
        notes = body.get("notes", "")

        # Debug logging
        logger.info(f"DEBUG: Adding payment for bill {bill_id}")
        logger.info(f"DEBUG: Payment data - amount: {amount}, date: {payment_date}, method: {payment_method}, notes: {notes}")

        if not bill_id or not amount or not payment_date or not payment_method:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID, amount, payment date, and payment method are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Get current bill
        response = bills_table.get_item(Key={"bill_id": bill_id})
        bill = response.get("Item")
        
        if not bill:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Validate payment amount doesn't exceed outstanding amount
        outstanding_amount = float(bill.get("outstanding_amount", 0))
        payment_amount = float(amount)
        
        logger.info(f"DEBUG: Outstanding amount: {outstanding_amount}, Payment amount: {payment_amount}")
        
        if payment_amount > outstanding_amount:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Payment amount cannot exceed outstanding balance."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Create new payment
        payment_id = f"payment-{os.urandom(8).hex()}"
        now = int(datetime.now().timestamp())
        
        new_payment = {
            "id": payment_id,
            "amount": Decimal(str(payment_amount)),
            "paymentDate": payment_date,
            "paymentMethod": payment_method,
            "notes": notes,
            "createdAt": now
        }

        # Update bill with new payment
        payments = bill.get("payments", [])
        payments.append(new_payment)
        
        current_paid_amount = float(bill.get("paid_amount", 0))
        total_amount = float(bill.get("total_amount", 0))
        new_paid_amount = current_paid_amount + payment_amount
        new_outstanding_amount = total_amount - new_paid_amount
        
        logger.info(f"DEBUG: Total amount: {total_amount}")
        logger.info(f"DEBUG: Current paid amount: {current_paid_amount}")
        logger.info(f"DEBUG: Payment amount: {payment_amount}")
        logger.info(f"DEBUG: New paid amount: {new_paid_amount}")
        logger.info(f"DEBUG: New outstanding: {new_outstanding_amount}")
        
        # Determine new status
        if new_outstanding_amount <= 0:
            new_status = "fully_paid"
        elif new_paid_amount > 0:
            new_status = "partially_paid"
        else:
            new_status = "unpaid"

        logger.info(f"DEBUG: New status: {new_status}")
        logger.info(f"DEBUG: About to update DynamoDB with payments: {payments}")
        logger.info(f"DEBUG: Payment being added: {new_payment}")
        logger.info(f"DEBUG: Total payments count: {len(payments)}")

        try:
            bills_table.update_item(
                Key={"bill_id": bill_id},
                UpdateExpression="SET payments = :payments, paid_amount = :paidAmount, outstanding_amount = :outstandingAmount, #s = :status, updated_at = :updatedAt",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":payments": payments,
                    ":paidAmount": Decimal(str(new_paid_amount)),
                    ":outstandingAmount": Decimal(str(new_outstanding_amount)),
                    ":status": new_status,
                    ":updatedAt": now,
                }
            )
            logger.info(f"DEBUG: DynamoDB update successful")
        except Exception as db_error:
            logger.error(f"DEBUG: DynamoDB update failed: {str(db_error)}")
            raise db_error

        # Get the updated bill to return complete information
        response = bills_table.get_item(Key={"bill_id": bill_id})
        updated_bill = response.get("Item")
        
        # Transform to match frontend expectations
        bill_response = {
            "id": updated_bill["bill_id"],
            "customerId": updated_bill["customer_id"],
            "billNumber": updated_bill.get("bill_number", ""),
            "billingDate": updated_bill["billing_date"],
            "deliveryDate": updated_bill["delivery_date"],
            "items": updated_bill.get("items", []),
            "receivedItems": updated_bill.get("received_items", []),
            "totalAmount": float(updated_bill["total_amount"]) if isinstance(updated_bill["total_amount"], Decimal) else updated_bill["total_amount"],
            "paidAmount": float(updated_bill.get("paid_amount", 0)) if isinstance(updated_bill.get("paid_amount", 0), Decimal) else updated_bill.get("paid_amount", 0),
            "outstandingAmount": float(updated_bill.get("outstanding_amount", 0)) if isinstance(updated_bill.get("outstanding_amount", 0), Decimal) else updated_bill.get("outstanding_amount", 0),
            "status": updated_bill.get("status", "unpaid"),
            "payments": updated_bill.get("payments", []),
            "notes": updated_bill.get("notes", ""),
            "createdAt": updated_bill.get("created_at"),
            "updatedAt": updated_bill.get("updated_at"),
            "payment": new_payment  # Include the new payment details
        }

        logger.info(f"Added payment {payment_id} to bill {bill_id}")
        return {
            "statusCode": 200,
            "body": json.dumps(bill_response, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "add_payment")

def update_payment(event, context):
    try:
        bill_id = event["pathParameters"]["id"]
        payment_id = event["pathParameters"]["paymentId"]
        body = json.loads(event.get("body", "{}"))
        amount = body.get("amount")
        payment_date = body.get("paymentDate")
        payment_method = body.get("paymentMethod")
        notes = body.get("notes", "")

        logger.info(f"DEBUG: Updating payment {payment_id} for bill {bill_id}")

        if not bill_id or not payment_id or not amount or not payment_date or not payment_method:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID, payment ID, amount, payment date, and payment method are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Get current bill
        response = bills_table.get_item(Key={"bill_id": bill_id})
        bill = response.get("Item")
        
        if not bill:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Find and update the payment
        payments = bill.get("payments", [])
        payment_found = False
        old_payment_amount = 0
        
        for i, payment in enumerate(payments):
            if payment.get("id") == payment_id:
                old_payment_amount = float(payment.get("amount", 0))
                payments[i] = {
                    "id": payment_id,
                    "amount": Decimal(str(amount)),
                    "paymentDate": payment_date,
                    "paymentMethod": payment_method,
                    "notes": notes,
                    "createdAt": payment.get("createdAt", int(datetime.now().timestamp()))
                }
                payment_found = True
                break
        
        if not payment_found:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Payment not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Recalculate amounts
        total_amount = float(bill.get("total_amount", 0))
        new_paid_amount = sum(float(p.get("amount", 0)) for p in payments)
        new_outstanding_amount = total_amount - new_paid_amount
        
        # Determine new status
        if new_outstanding_amount <= 0:
            new_status = "fully_paid"
        elif new_paid_amount > 0:
            new_status = "partially_paid"
        else:
            new_status = "unpaid"

        now = int(datetime.now().timestamp())

        # Update bill in database
        bills_table.update_item(
            Key={"bill_id": bill_id},
            UpdateExpression="SET payments = :payments, paid_amount = :paidAmount, outstanding_amount = :outstandingAmount, #s = :status, updated_at = :updatedAt",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":payments": payments,
                ":paidAmount": Decimal(str(new_paid_amount)),
                ":outstandingAmount": Decimal(str(new_outstanding_amount)),
                ":status": new_status,
                ":updatedAt": now,
            }
        )

        # Get the updated bill to return complete information
        response = bills_table.get_item(Key={"bill_id": bill_id})
        updated_bill = response.get("Item")
        
        # Find the updated payment
        updated_payment = None
        for payment in updated_bill.get("payments", []):
            if payment.get("id") == payment_id:
                updated_payment = payment
                break

        # Transform to match frontend expectations
        bill_response = {
            "id": updated_bill["bill_id"],
            "customerId": updated_bill["customer_id"],
            "billNumber": updated_bill.get("bill_number", ""),
            "billingDate": updated_bill["billing_date"],
            "deliveryDate": updated_bill["delivery_date"],
            "items": updated_bill.get("items", []),
            "receivedItems": updated_bill.get("received_items", []),
            "totalAmount": float(updated_bill["total_amount"]) if isinstance(updated_bill["total_amount"], Decimal) else updated_bill["total_amount"],
            "paidAmount": float(updated_bill.get("paid_amount", 0)) if isinstance(updated_bill.get("paid_amount", 0), Decimal) else updated_bill.get("paid_amount", 0),
            "outstandingAmount": float(updated_bill.get("outstanding_amount", 0)) if isinstance(updated_bill.get("outstanding_amount", 0), Decimal) else updated_bill.get("outstanding_amount", 0),
            "status": updated_bill.get("status", "unpaid"),
            "payments": updated_bill.get("payments", []),
            "notes": updated_bill.get("notes", ""),
            "createdAt": updated_bill.get("created_at"),
            "updatedAt": updated_bill.get("updated_at"),
            "payment": updated_payment
        }

        logger.info(f"Updated payment {payment_id} for bill {bill_id}")
        return {
            "statusCode": 200,
            "body": json.dumps(bill_response, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "update_payment")

def delete_payment(event, context):
    try:
        bill_id = event["pathParameters"]["id"]
        payment_id = event["pathParameters"]["paymentId"]

        logger.info(f"DEBUG: Deleting payment {payment_id} from bill {bill_id}")

        if not bill_id or not payment_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID and payment ID are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Get current bill
        response = bills_table.get_item(Key={"bill_id": bill_id})
        bill = response.get("Item")
        
        if not bill:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Find and remove the payment
        payments = bill.get("payments", [])
        payment_found = False
        deleted_payment_amount = 0
        
        for i, payment in enumerate(payments):
            if payment.get("id") == payment_id:
                deleted_payment_amount = float(payment.get("amount", 0))
                payments.pop(i)
                payment_found = True
                break
        
        if not payment_found:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Payment not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Recalculate amounts
        total_amount = float(bill.get("total_amount", 0))
        new_paid_amount = sum(float(p.get("amount", 0)) for p in payments)
        new_outstanding_amount = total_amount - new_paid_amount
        
        # Determine new status
        if new_outstanding_amount <= 0:
            new_status = "fully_paid"
        elif new_paid_amount > 0:
            new_status = "partially_paid"
        else:
            new_status = "unpaid"

        now = int(datetime.now().timestamp())

        # Update bill in database
        bills_table.update_item(
            Key={"bill_id": bill_id},
            UpdateExpression="SET payments = :payments, paid_amount = :paidAmount, outstanding_amount = :outstandingAmount, #s = :status, updated_at = :updatedAt",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":payments": payments,
                ":paidAmount": Decimal(str(new_paid_amount)),
                ":outstandingAmount": Decimal(str(new_outstanding_amount)),
                ":status": new_status,
                ":updatedAt": now,
            }
        )

        # Get the updated bill to return complete information
        response = bills_table.get_item(Key={"bill_id": bill_id})
        updated_bill = response.get("Item")
        
        # Transform to match frontend expectations
        bill_response = {
            "id": updated_bill["bill_id"],
            "customerId": updated_bill["customer_id"],
            "billNumber": updated_bill.get("bill_number", ""),
            "billingDate": updated_bill["billing_date"],
            "deliveryDate": updated_bill["delivery_date"],
            "items": updated_bill.get("items", []),
            "receivedItems": updated_bill.get("received_items", []),
            "totalAmount": float(updated_bill["total_amount"]) if isinstance(updated_bill["total_amount"], Decimal) else updated_bill["total_amount"],
            "paidAmount": float(updated_bill.get("paid_amount", 0)) if isinstance(updated_bill.get("paid_amount", 0), Decimal) else updated_bill.get("paid_amount", 0),
            "outstandingAmount": float(updated_bill.get("outstanding_amount", 0)) if isinstance(updated_bill.get("outstanding_amount", 0), Decimal) else updated_bill.get("outstanding_amount", 0),
            "status": updated_bill.get("status", "unpaid"),
            "payments": updated_bill.get("payments", []),
            "notes": updated_bill.get("notes", ""),
            "createdAt": updated_bill.get("created_at"),
            "updatedAt": updated_bill.get("updated_at")
        }

        logger.info(f"Deleted payment {payment_id} from bill {bill_id}")
        return {
            "statusCode": 200,
            "body": json.dumps(bill_response, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "delete_payment")

def test_bill_calculation(event, context):
    """
    Test endpoint to verify bill calculation logic
    """
    try:
        bill_id = event["pathParameters"]["id"]
        
        # Get the bill
        response = bills_table.get_item(Key={"bill_id": bill_id})
        bill = response.get("Item")
        
        if not bill:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Bill not found"}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }
        
        # Calculate amounts
        total_amount = float(bill.get("total_amount", 0))
        payments = bill.get("payments", [])
        calculated_paid_amount = sum(float(payment.get("amount", 0)) for payment in payments)
        calculated_outstanding_amount = total_amount - calculated_paid_amount
        
        # Get stored amounts
        stored_paid_amount = float(bill.get("paid_amount", 0))
        stored_outstanding_amount = float(bill.get("outstanding_amount", 0))
        
        result = {
            "billId": bill_id,
            "totalAmount": total_amount,
            "storedPaidAmount": stored_paid_amount,
            "calculatedPaidAmount": calculated_paid_amount,
            "storedOutstandingAmount": stored_outstanding_amount,
            "calculatedOutstandingAmount": calculated_outstanding_amount,
            "paymentsCount": len(payments),
            "payments": [{"id": p.get("id"), "amount": float(p.get("amount", 0)), "date": p.get("paymentDate")} for p in payments],
            "isConsistent": (stored_paid_amount == calculated_paid_amount and stored_outstanding_amount == calculated_outstanding_amount)
        }
        
        return {
            "statusCode": 200,
            "body": json.dumps(result, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "test_bill_calculation")

def recalculate_bill_amounts(event, context):
    """
    Utility function to recalculate outstanding amounts for all bills.
    This can be used to fix data inconsistencies.
    """
    try:
        # Scan all bills
        response = bills_table.scan()
        bills = response.get("Items", [])
        
        updated_count = 0
        
        for bill in bills:
            bill_id = bill["bill_id"]
            total_amount = float(bill.get("total_amount", 0))
            payments = bill.get("payments", [])
            
            # Calculate paid amount from payments
            paid_amount = sum(float(payment.get("amount", 0)) for payment in payments)
            outstanding_amount = total_amount - paid_amount
            
            # Determine status
            if outstanding_amount <= 0:
                status = "fully_paid"
            elif paid_amount > 0:
                status = "partially_paid"
            else:
                status = "unpaid"
            
            # Update the bill if amounts are different
            current_paid = float(bill.get("paid_amount", 0))
            current_outstanding = float(bill.get("outstanding_amount", 0))
            current_status = bill.get("status", "unpaid")
            
            if (current_paid != paid_amount or 
                current_outstanding != outstanding_amount or 
                current_status != status):
                
                logger.info(f"Updating bill {bill_id}: paid {current_paid} -> {paid_amount}, outstanding {current_outstanding} -> {outstanding_amount}, status {current_status} -> {status}")
                
                bills_table.update_item(
                    Key={"bill_id": bill_id},
                    UpdateExpression="SET paid_amount = :paidAmount, outstanding_amount = :outstandingAmount, #s = :status, updated_at = :updatedAt",
                    ExpressionAttributeNames={"#s": "status"},
                    ExpressionAttributeValues={
                        ":paidAmount": Decimal(str(paid_amount)),
                        ":outstandingAmount": Decimal(str(outstanding_amount)),
                        ":status": status,
                        ":updatedAt": int(datetime.now().timestamp()),
                    }
                )
                updated_count += 1
        
        logger.info(f"Recalculated amounts for {updated_count} bills")
        return {
            "statusCode": 200,
            "body": json.dumps({"message": f"Recalculated amounts for {updated_count} bills"}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "recalculate_bill_amounts")

# Billing Configuration Functions
def get_billing_config_items(event, context):
    try:
        response = billing_config_items_table.scan()
        items = []
        
        for item in response.get("Items", []):
            config_item = {
                "id": item["config_item_id"],
                "name": item["name"],
                "description": item.get("description", ""),
                "price": float(item["price"]) if isinstance(item["price"], Decimal) else item["price"],
                "category": item["category"],
                "isActive": item.get("is_active", True),
                "createdAt": item.get("created_at"),
                "updatedAt": item.get("updated_at"),
            }
            items.append(config_item)

        logger.info(f"Fetched {len(items)} billing config items")
        return {
            "statusCode": 200,
            "body": json.dumps({"items": items}, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_billing_config_items")

def add_billing_config_item(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        name = body.get("name")
        description = body.get("description", "")
        price = body.get("price")
        category = body.get("category")

        if not name or price is None or not category:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Name, price, and category are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        config_item_id = f"config-{os.urandom(16).hex()}"
        now = int(datetime.now().timestamp())

        item = {
            "config_item_id": config_item_id,
            "name": name,
            "description": description,
            "price": Decimal(str(price)),
            "category": category,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        billing_config_items_table.put_item(Item=item)

        response_item = {
            "id": config_item_id,
            "name": name,
            "description": description,
            "price": float(price),
            "category": category,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }

        logger.info(f"Added billing config item: {config_item_id}")
        return {
            "statusCode": 200,
            "body": json.dumps(response_item, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "add_billing_config_item")

# Received Item Templates Functions
def get_received_item_templates(event, context):
    try:
        response = received_item_templates_table.scan()
        templates = []
        
        for item in response.get("Items", []):
            template = {
                "id": item["template_id"],
                "name": item["name"],
                "description": item.get("description", ""),
                "category": item["category"],
                "isActive": item.get("is_active", True),
                "createdAt": item.get("created_at"),
                "updatedAt": item.get("updated_at"),
            }
            templates.append(template)

        logger.info(f"Fetched {len(templates)} received item templates")
        return {
            "statusCode": 200,
            "body": json.dumps({"templates": templates}, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_received_item_templates")

def add_received_item_template(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        name = body.get("name")
        description = body.get("description", "")
        category = body.get("category")

        if not name or not category:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Name and category are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        template_id = f"template-{os.urandom(16).hex()}"
        now = int(datetime.now().timestamp())

        item = {
            "template_id": template_id,
            "name": name,
            "description": description,
            "category": category,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        received_item_templates_table.put_item(Item=item)

        response_template = {
            "id": template_id,
            "name": name,
            "description": description,
            "category": category,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }

        logger.info(f"Added received item template: {template_id}")
        return {
            "statusCode": 200,
            "body": json.dumps(response_template, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "add_received_item_template")


def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    http_method = event.get("httpMethod")
    path = event.get("path")
    logger.info(f"DEBUG: Received path: {path}, httpMethod: {http_method}")

    if path == "/bills":
        if http_method == "GET":
            return get_bills(event, context)
        elif http_method == "POST":
            return add_bill(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)

    elif path.startswith("/bills/") and "/payments" in path:
        # Handle payment endpoints
        if path.endswith("/payments"):
            if http_method == "POST":
                return add_payment(event, context)
            elif http_method == "OPTIONS":
                return handle_options(event, context)
        elif "/payments/" in path and not path.endswith("/payments"):
            # Handle specific payment operations: /bills/{id}/payments/{paymentId}
            if http_method == "PUT":
                return update_payment(event, context)
            elif http_method == "DELETE":
                return delete_payment(event, context)
            elif http_method == "OPTIONS":
                return handle_options(event, context)
    elif path.startswith("/bills/"):
        if http_method == "GET":
            return get_bill_by_id(event, context)
        elif http_method == "PUT":
            return update_bill(event, context)
        elif http_method == "DELETE":
            return delete_bill(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path == "/billing-config-items":
        if http_method == "GET":
            return get_billing_config_items(event, context)
        elif http_method == "POST":
            return add_billing_config_item(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/billing-config-items/"):
        if http_method == "PUT":
            return update_billing_config_item(event, context)
        elif http_method == "DELETE":
            return delete_billing_config_item(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path == "/received-item-templates":
        if http_method == "GET":
            return get_received_item_templates(event, context)
        elif http_method == "POST":
            return add_received_item_template(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/received-item-templates/"):
        if http_method == "PUT":
            return update_received_item_template(event, context)
        elif http_method == "DELETE":
            return delete_received_item_template(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path == "/bill-items":
        if http_method == "GET":
            return get_all_bill_items(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/bill-items/by-bill/"):
        if http_method == "GET":
            return get_bill_items_by_bill_id(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/bill-items/"):
        if http_method == "GET":
            return get_bill_item_by_id(event, context)
        elif http_method == "PUT":
            return update_bill_item(event, context)
        elif http_method == "DELETE":
            return delete_bill_item(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/customers/") and "/measurements" in path:
        if http_method == "GET" and path.endswith("/measurements"):
            return get_customer_measurements(event, context)
        elif http_method == "POST" and path.endswith("/measurements"):
            return save_customer_measurement(event, context)
        elif http_method == "DELETE" and "/measurements/" in path and path.count('/') == 4:
            return delete_customer_measurement(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)

    return {
        "statusCode": 404,
        "body": json.dumps({"error": "Not Found"}),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    }
