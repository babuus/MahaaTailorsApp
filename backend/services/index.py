import os
import json
import boto3
from botocore.exceptions import ClientError
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

REGION = os.environ.get("AWS_REGION", "ap-south-1")
SERVICES_TABLE_NAME = os.environ.get("SERVICES_TABLE_NAME", "Services")

print(f"DEBUG: Using REGION: {REGION}")
print(f"DEBUG: Using SERVICES_TABLE_NAME: {SERVICES_TABLE_NAME}")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
services_table = dynamodb.Table(SERVICES_TABLE_NAME)

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

def add_service(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        name = body.get("name")
        description = body.get("description")
        default_price = body.get("defaultPrice")

        if not name or default_price is None:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Service name and default price are required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        service_id = f"svc-{int(os.urandom(4).hex(), 16)}" # Simple unique ID
        now = boto3.dynamodb.types.Decimal(str(int(os.urandom(4).hex(), 16)))

        item = {
            "service_id": service_id,
            "name": name,
            "description": description,
            "default_price": default_price,
            "created_at": now,
            "updated_at": now,
        }

        services_table.put_item(Item=item)

        logger.info(f"Added service: {item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "id": service_id,
                "name": name,
                "description": description,
                "defaultPrice": default_price,
            }),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "add_service")

def get_services(event, context):
    try:
        response = services_table.scan()
        services = [
            {
                "id": item["service_id"],
                "name": item["name"],
                "description": item.get("description"),
                "defaultPrice": item["default_price"],
            }
            for item in response.get("Items", [])
        ]

        logger.info(f"Fetched services: {services}")
        return {
            "statusCode": 200,
            "body": json.dumps(services),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_services")

def update_service(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        service_id = event["pathParameters"]["id"]
        name = body.get("name")
        description = body.get("description")
        default_price = body.get("defaultPrice")

        if not service_id or not name or default_price is None:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Service ID, name, and default price are required for update."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = boto3.dynamodb.types.Decimal(str(int(os.urandom(4).hex(), 16)))

        update_expression = "SET #n = :name, description = :description, default_price = :defaultPrice, updated_at = :updatedAt"
        expression_attribute_names = {"#n": "name"}
        expression_attribute_values = {
            ":name": name,
            ":description": description,
            ":defaultPrice": default_price,
            ":updatedAt": now,
        }

        response = services_table.update_item(
            Key={"service_id": service_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
        )

        updated_item = response.get("Attributes")
        logger.info(f"Updated service: {updated_item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "id": updated_item["service_id"],
                "name": updated_item["name"],
                "description": updated_item.get("description"),
                "defaultPrice": updated_item["default_price"],
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
                "body": json.dumps({"error": "Service not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }
        return handle_error(e, "update_service")
    except Exception as e:
        return handle_error(e, "update_service")

def delete_service(event, context):
    try:
        service_id = event["pathParameters"]["id"]
        if not service_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Service ID is required for deletion."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        services_table.delete_item(Key={"service_id": service_id})

        logger.info(f"Deleted service with ID: {service_id}")
        return {
            "statusCode": 200,
            "body": json.dumps("Service deleted successfully!"),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "delete_service")

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    http_method = event.get("httpMethod")
    path = event.get("path")

    if path == "/services":
        if http_method == "GET":
            return get_services(event, context)
        elif http_method == "POST":
            return add_service(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/services/"):
        if http_method == "PUT":
            return update_service(event, context)
        elif http_method == "DELETE":
            return delete_service(event, context)
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