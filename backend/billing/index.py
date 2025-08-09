import os
import json
import boto3
from botocore.exceptions import ClientError
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

REGION = os.environ.get("AWS_REGION", "ap-south-1")
BILLS_TABLE_NAME = os.environ.get("BILLS_TABLE_NAME", "Bills")
CUSTOMERS_TABLE_NAME = os.environ.get("CUSTOMERS_TABLE_NAME", "Customers")

print(f"DEBUG: Using REGION: {REGION}")
print(f"DEBUG: Using BILLS_TABLE_NAME: {BILLS_TABLE_NAME}")
print(f"DEBUG: Using CUSTOMERS_TABLE_NAME: {CUSTOMERS_TABLE_NAME}")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
bills_table = dynamodb.Table(BILLS_TABLE_NAME)
customers_table = dynamodb.Table(CUSTOMERS_TABLE_NAME)

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

def get_bills(event, context):
    try:
        response = bills_table.scan()
        bills = [
            {
                "billId": item["bill_id"],
                "customerId": item["customer_id"],
                "billDate": item["bill_date"],
                "totalAmount": item["total_amount"],
                "status": item["status"],
                "items": item.get("items", []),
                "createdAt": item.get("created_at"),
                "updatedAt": item.get("updated_at"),
            }
            for item in response.get("Items", [])
        ]

        logger.info(f"Fetched bills: {bills}")
        return {
            "statusCode": 200,
            "body": json.dumps(bills),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_bills")

def add_bill(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        customer_id = body.get("customerId")
        bill_date = body.get("billDate")
        total_amount = body.get("totalAmount")
        status = body.get("status")
        items = body.get("items", [])

        if not customer_id or not bill_date or total_amount is None or not status:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer ID, bill date, total amount, and status are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        bill_id = f"bill-{int(os.urandom(4).hex(), 16)}"
        now = boto3.dynamodb.types.Decimal(str(int(os.urandom(4).hex(), 16)))

        item = {
            "bill_id": bill_id,
            "customer_id": customer_id,
            "bill_date": bill_date,
            "total_amount": total_amount,
            "status": status,
            "items": items,
            "created_at": now,
            "updated_at": now,
        }

        bills_table.put_item(Item=item)

        logger.info(f"Added bill: {item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "billId": bill_id,
                "customerId": customer_id,
                "billDate": bill_date,
                "totalAmount": total_amount,
                "status": status,
                "items": items,
            }),
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
        bill_date = body.get("billDate")
        total_amount = body.get("totalAmount")
        status = body.get("status")
        items = body.get("items", [])

        if not bill_id or not customer_id or not bill_date or total_amount is None or not status:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Bill ID, customer ID, bill date, total amount, and status are required for update."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = boto3.dynamodb.types.Decimal(str(int(os.urandom(4).hex(), 16)))

        update_expression = "SET customer_id = :customerId, bill_date = :billDate, total_amount = :totalAmount, #s = :status, items = :items, updated_at = :updatedAt"
        expression_attribute_names = {"#s": "status"}
        expression_attribute_values = {
            ":customerId": customer_id,
            ":billDate": bill_date,
            ":totalAmount": total_amount,
            ":status": status,
            ":items": items,
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
        logger.info(f"Updated bill: {updated_item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "billId": updated_item["bill_id"],
                "customerId": updated_item["customer_id"],
                "billDate": updated_item["bill_date"],
                "totalAmount": updated_item["total_amount"],
                "status": updated_item["status"],
                "items": updated_item.get("items"),
            }),
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

def delete_customer_measurement(event, context):
    try:
        customer_id = event["pathParameters"]["id"]
        measurement_id = event["pathParameters"]["measurementId"]

        if not customer_id or not measurement_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer ID and Measurement ID are required for deletion."}),
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

        customer_measurements = customer.get("measurements", {})
        if measurement_id in customer_measurements:
            del customer_measurements[measurement_id]
        else:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "Measurement not found for this customer."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = boto3.dynamodb.types.Decimal(str(int(os.urandom(4).hex(), 16)))

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

        logger.info(f"Deleted measurement {measurement_id} for customer {customer_id}")
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Measurement deleted successfully!"}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "delete_customer_measurement")

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    http_method = event.get("httpMethod")
    path = event.get("path")

    if path == "/bills":
        if http_method == "GET":
            return get_bills(event, context)
        elif http_method == "POST":
            return add_bill(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/bills/"):
        if http_method == "PUT":
            return update_bill(event, context)
        elif http_method == "DELETE":
            return delete_bill(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/customers/") and "/measurements" in path:
        if http_method == "GET" and path.endswith("/measurements"):
            return get_customer_measurements(event, context)
        elif http_method == "POST" and path.endswith("/measurements"):
            return save_customer_measurement(event, context)
        elif http_method == "DELETE" and "/measurements/" in path and path.count('/') == 4: # /customers/{id}/measurements/{measurementId}
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
