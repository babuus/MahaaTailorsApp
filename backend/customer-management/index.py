import os
import json
import boto3
from botocore.exceptions import ClientError
import logging
from boto3.dynamodb.conditions import Attr
from datetime import datetime # Import datetime
from decimal import Decimal # Import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return json.JSONEncoder.default(self, obj)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

REGION = os.environ.get("AWS_REGION", "ap-south-1")
CUSTOMERS_TABLE_NAME = os.environ.get("CUSTOMERS_TABLE_NAME", "Customers")
MEASUREMENT_CONFIGS_TABLE_NAME = os.environ.get("MEASUREMENT_CONFIGS_TABLE_NAME", "MeasurementConfigs")
BILLS_TABLE_NAME = os.environ.get("BILLS_TABLE_NAME", "Bills")

print(f"DEBUG: Using REGION: {REGION}")
print(f"DEBUG: Using CUSTOMERS_TABLE_NAME: {CUSTOMERS_TABLE_NAME}")
print(f"DEBUG: Using MEASUREMENT_CONFIGS_TABLE_NAME: {MEASUREMENT_CONFIGS_TABLE_NAME}")
print(f"DEBUG: Using BILLS_TABLE_NAME: {BILLS_TABLE_NAME}")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
customers_table = dynamodb.Table(CUSTOMERS_TABLE_NAME)
measurement_configs_table = dynamodb.Table(MEASUREMENT_CONFIGS_TABLE_NAME)
bills_table = dynamodb.Table(BILLS_TABLE_NAME)

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

def get_customers(event, context):
    try:
        query_params = event.get("queryStringParameters", {})
        search_text = query_params.get("searchText")
        search_field = query_params.get("searchField")
        limit = int(query_params.get("limit", 10))
        start_after = query_params.get("startAfter")

        scan_kwargs = {
            "Limit": limit
        }

        logger.info(f"get_customers received search_text: {search_text}, search_field: {search_field}")

        if search_text and search_field == 'universal':
            # This is the corrected logic block
            search_text_lower = search_text.lower()

            # Define filter for NEW records that have the _lower fields (case-insensitive)
            # This filter will only apply if 'personalDetails_lower' exists
            new_data_filter = (
                Attr("personalDetails_lower.name").contains(search_text_lower) |
                Attr("personalDetails_lower.phone").contains(search_text_lower) |
                Attr("personalDetails_lower.address").contains(search_text_lower) |
                Attr("personalDetails_lower.email").contains(search_text_lower) |
                Attr("customerNumber_lower").contains(search_text_lower)
            )

            # Define filter for OLD records without _lower fields (case-sensitive)
            # This filter will only apply if 'personalDetails_lower' does NOT exist
            old_data_filter = (
                Attr("personalDetails.name").contains(search_text) |
                Attr("personalDetails.phone").contains(search_text) |
                Attr("personalDetails.address").contains(search_text) |
                Attr("personalDetails.email").contains(search_text) |
                Attr("customerNumber").contains(search_text)
            )

            # Combine the filters:
            # - If personalDetails_lower exists, use the new_data_filter.
            # - If personalDetails_lower does not exist, use the old_data_filter.
            # The '&' is AND, '|' is OR.
            scan_kwargs["FilterExpression"] = (
                (Attr('personalDetails_lower').exists() & new_data_filter) |
                (Attr('personalDetails_lower').not_exists() & old_data_filter)
            )

        elif search_text and search_field and search_field != 'universal':
            # This logic remains for specific field searches
            scan_kwargs["FilterExpression"] = Attr(search_field).contains(search_text)

        if start_after and start_after.lower() not in ["null", "undefined"]:
            scan_kwargs["ExclusiveStartKey"] = {"customer_id": start_after}

        logger.info(f"DynamoDB scan_kwargs: {scan_kwargs}")
        
        try:
            response = customers_table.scan(**scan_kwargs)
            logger.info(f"DynamoDB scan response count: {response.get('Count')}")
            customers = [
                {
                    "id": item["customer_id"],
                    "personalDetails": item.get("personalDetails", {}),
                    "measurements": item.get("measurements", []),
                    "comments": item.get("comments", ""),
                    "customerNumber": item.get("customerNumber"),
                    "createdAt": item.get("created_at"),
                    "updatedAt": item.get("updated_at"),
                }
                for item in response.get("Items", [])
            ]
        except ClientError as e:
            logger.error(f"DynamoDB ClientError during scan: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
            raise e

        last_evaluated_key = response.get("LastEvaluatedKey", {}).get("customer_id")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "customers": customers,
                "lastEvaluatedKey": last_evaluated_key
            }, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_customers")

def get_customer_by_id(event, context):
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

        customer_details = {
            "id": customer["customer_id"],
            "personalDetails": customer.get("personalDetails", {}),
            "measurements": customer.get("measurements", []),
            "comments": customer.get("comments", ""),
            "customerNumber": customer.get("customerNumber"),
            "createdAt": customer.get("created_at"),
            "updatedAt": customer.get("updated_at"),
        }

        return {
            "statusCode": 200,
            "body": json.dumps(customer_details, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_customer_by_id")

def add_customer(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        personal_details = body.get("personalDetails", {})
        measurements = body.get("measurements", [])
        comments = body.get("comments", "")

        name = personal_details.get("name")
        phone = personal_details.get("phone")

        if not name or not phone:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer name and phone are required in personalDetails."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Generate a unique customer_id
        customer_id = f"cust-{os.urandom(16).hex()}"
        # Generate a simple customerNumber from the customer_id for display purposes
        # In a real application, this might be a sequential number from a counter
        customer_number = customer_id[-8:] # Use last 8 characters of the UUID
        now = int(datetime.now().timestamp()) # Use current timestamp

        # Prepare lowercase fields for search
        personal_details_lower = {k: v.lower() if isinstance(v, str) else v for k, v in personal_details.items()}
        customer_number_lower = customer_number.lower() if isinstance(customer_number, str) else customer_number

        item = {
            "customer_id": customer_id,
            "customerNumber": customer_number,
            "customerNumber_lower": customer_number_lower, # Store lowercase customer number
            "personalDetails": personal_details,
            "personalDetails_lower": personal_details_lower, # Store lowercase personal details
            "measurements": measurements,
            "comments": comments,
            "created_at": now,
            "updated_at": now,
        }

        logger.info(f"Attempting to put item into DynamoDB: {json.dumps(item, cls=DecimalEncoder)}")
        customers_table.put_item(Item=item)
        logger.info(f"Successfully added customer with ID: {customer_id}")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "id": customer_id,
                "personalDetails": personal_details,
                "measurements": measurements,
                "comments": comments,
            }, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "add_customer")

def update_customer(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        customer_id = event["pathParameters"]["id"]
        personal_details = body.get("personalDetails", {})
        measurements = body.get("measurements", [])
        comments = body.get("comments", "")

        name = personal_details.get("name")
        phone = personal_details.get("phone")

        if not customer_id or not name or not phone:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer ID, name, and phone are required for update."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = int(datetime.now().timestamp())

        # Prepare lowercase fields for update
        personal_details_lower = {k: v.lower() if isinstance(v, str) else v for k, v in personal_details.items()}
        # Assuming customerNumber is not updated via this path, or fetched and re-lowercased if it were.
        # For now, we'll only update personalDetails_lower.

        update_expression = "SET personalDetails = :personalDetails, personalDetails_lower = :personalDetails_lower, measurements = :measurements, comments = :comments, updated_at = :updatedAt"
        expression_attribute_values = {
            ":personalDetails": personal_details,
            ":personalDetails_lower": personal_details_lower, # Update lowercase personal details
            ":measurements": measurements,
            ":comments": comments,
            ":updatedAt": now,
        }

        response = customers_table.update_item(
            Key={"customer_id": customer_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
        )

        updated_item = response.get("Attributes")
        logger.info(f"Updated customer: {updated_item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "id": updated_item["customer_id"],
                "personalDetails": updated_item.get("personalDetails"),
                "measurements": updated_item.get("measurements"),
                "comments": updated_item.get("comments"),
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
                "body": json.dumps({"error": "Customer not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }
        return handle_error(e, "update_customer")
    except Exception as e:
        return handle_error(e, "update_customer")

def delete_customer(event, context):
    try:
        customer_id = event["pathParameters"]["id"]
        if not customer_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Customer ID is required for deletion."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        customers_table.delete_item(Key={"customer_id": customer_id})

        logger.info(f"Deleted customer with ID: {customer_id}")
        return {
            "statusCode": 200,
            "body": json.dumps("Customer deleted successfully!"),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "delete_customer")

def check_customer_exists(event, context):
    try:
        query_params = event.get("queryStringParameters", {})
        phone = query_params.get("phone")

        if not phone:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Phone number is required for existence check."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        filter_expression = Attr("personalDetails.phone").eq(phone)

        scan_kwargs = {
            "FilterExpression": filter_expression
        }

        response = customers_table.scan(**scan_kwargs)
        all_found_customers = response.get("Items", [])

        phone_only_duplicates = []

        for customer in all_found_customers:
            # Convert Decimal types to float for JSON serialization
            if 'created_at' in customer:
                customer['created_at'] = float(customer['created_at'])
            if 'updated_at' in customer:
                customer['updated_at'] = float(customer['updated_at'])
            if 'personalDetails' in customer:
                if isinstance(customer['personalDetails'], dict):
                    for key, value in customer['personalDetails'].items():
                        if isinstance(value, Decimal):
                            customer['personalDetails'][key] = float(value)

            # Categorize duplicates
            customer_phone = customer.get("personalDetails", {}).get("phone")

            if phone and customer_phone == phone:
                phone_only_duplicates.append(customer)

        customer_exists = len(phone_only_duplicates) > 0

        logger.info(f"Customer existence check with params {query_params}: exists={customer_exists}, "
                    f"phone_only_duplicates={len(phone_only_duplicates)}")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "exists": customer_exists,
                "allCustomers": all_found_customers, # Still return all found customers for context if needed
                "phoneOnlyDuplicates": phone_only_duplicates,
            }, cls=DecimalEncoder),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "check_customer_exists")

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

        # Get customer to retrieve measurements
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

        measurements = customer.get("measurements", [])
        
        return {
            "statusCode": 200,
            "body": json.dumps({"measurements": measurements}, cls=DecimalEncoder),
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

        # Get current customer data
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

        measurements = customer.get("measurements", [])
        measurement_id = body.get("id")
        
        # Create new measurement object
        new_measurement = {
            "id": measurement_id or f"meas-{os.urandom(8).hex()}",
            "garmentType": body.get("garmentType"),
            "fields": body.get("fields", []),
            "notes": body.get("notes", ""),
            "lastMeasuredDate": body.get("lastMeasuredDate"),
        }
        
        # Update or add measurement
        if measurement_id:
            # Update existing measurement
            for i, meas in enumerate(measurements):
                if meas.get("id") == measurement_id:
                    measurements[i] = new_measurement
                    break
            else:
                measurements.append(new_measurement)
        else:
            # Add new measurement
            measurements.append(new_measurement)
        
        # Update customer with new measurements
        now = int(datetime.now().timestamp())
        customers_table.update_item(
            Key={"customer_id": customer_id},
            UpdateExpression="SET measurements = :measurements, updated_at = :updatedAt",
            ExpressionAttributeValues={
                ":measurements": measurements,
                ":updatedAt": now,
            }
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps(new_measurement, cls=DecimalEncoder),
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
                "body": json.dumps({"error": "Customer ID and Measurement ID are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        # Get current customer data
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

        measurements = customer.get("measurements", [])
        
        # Remove measurement with matching ID
        measurements = [meas for meas in measurements if meas.get("id") != measurement_id]
        
        # Update customer with filtered measurements
        now = int(datetime.now().timestamp())
        customers_table.update_item(
            Key={"customer_id": customer_id},
            UpdateExpression="SET measurements = :measurements, updated_at = :updatedAt",
            ExpressionAttributeValues={
                ":measurements": measurements,
                ":updatedAt": now,
            }
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Measurement deleted successfully"}),
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
    logger.info(f"DEBUG: Received path: {path}, httpMethod: {http_method}")

    if path == "/customers":
        if http_method == "GET":
            return get_customers(event, context)
        elif http_method == "POST":
            return add_customer(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/customers/exists"): # Use startswith for more robust path matching
        if http_method == "GET":
            return check_customer_exists(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif "/measurements" in path:
        # Handle customer measurements endpoints
        if path.endswith("/measurements"):
            if http_method == "GET":
                return get_customer_measurements(event, context)
            elif http_method == "POST":
                return save_customer_measurement(event, context)
            elif http_method == "OPTIONS":
                return handle_options(event, context)
        elif "/measurements/" in path:
            if http_method == "DELETE":
                return delete_customer_measurement(event, context)
            elif http_method == "OPTIONS":
                return handle_options(event, context)
    elif path.startswith("/customers/"):
        if http_method == "GET":
            return get_customer_by_id(event, context)
        elif http_method == "PUT":
            return update_customer(event, context)
        elif http_method == "DELETE":
            return delete_customer(event, context)
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
