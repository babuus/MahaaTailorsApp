import os
import json
import boto3
from botocore.exceptions import ClientError
import logging
import time

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

REGION = os.environ.get("AWS_REGION", "ap-south-1")
MEASUREMENT_CONFIGS_TABLE_NAME = os.environ.get("MEASUREMENT_CONFIGS_TABLE_NAME", "MeasurementConfigs")

print(f"DEBUG: Using REGION: {REGION}")
print(f"DEBUG: Using MEASUREMENT_CONFIGS_TABLE_NAME: {MEASUREMENT_CONFIGS_TABLE_NAME}")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
measurement_configs_table = dynamodb.Table(MEASUREMENT_CONFIGS_TABLE_NAME)

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

def get_measurement_configs(event, context):
    try:
        response = measurement_configs_table.scan()
        measurement_configs = [
            {
                "id": item["garment_type"],  # Use garment_type as id for frontend compatibility
                "garmentType": item["garment_type"],
                "measurements": item.get("measurements", []),
                "createdAt": int(item["created_at"]) if item.get("created_at") else None,
                "updatedAt": int(item["updated_at"]) if item.get("updated_at") else None,
            }
            for item in response.get("Items", [])
        ]

        logger.info(f"Fetched measurement configs: {measurement_configs}")
        return {
            "statusCode": 200,
            "body": json.dumps(measurement_configs),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "get_measurement_configs")

def add_measurement_config(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        logger.info(f"Add config request body: {body}")
        garment_type = body.get("garmentType")
        measurements = body.get("measurements", body.get("fields", []))
        logger.info(f"Parsed measurements for add: {measurements}")

        if not garment_type:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Garment type is required."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = int(time.time())

        item = {
            "garment_type": garment_type,
            "measurements": measurements,
            "created_at": now,
            "updated_at": now,
        }

        measurement_configs_table.put_item(Item=item)

        logger.info(f"Added measurement config: {item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "id": garment_type,  # Include id for frontend compatibility
                "garmentType": garment_type,
                "measurements": measurements,
            }),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "add_measurement_config")

def update_measurement_config_by_id(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        logger.info(f"Update config by ID request body: {body}")
        garment_type = event["pathParameters"]["id"]
        measurements = body.get("measurements", body.get("fields", []))
        logger.info(f"Parsed measurements for update by ID: {measurements}")

        if not garment_type:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Garment type is required for update."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = int(time.time())

        update_expression = "SET measurements = :measurements, updated_at = :updatedAt"
        expression_attribute_values = {
            ":measurements": measurements,
            ":updatedAt": now,
        }

        response = measurement_configs_table.update_item(
            Key={"garment_type": garment_type},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
        )

        updated_item = response.get("Attributes")
        logger.info(f"Updated measurement config: {updated_item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "id": updated_item["garment_type"],  # Include id for frontend compatibility
                "garmentType": updated_item["garment_type"],
                "measurements": updated_item.get("measurements"),
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
                "body": json.dumps({"error": "Measurement config not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }
        return handle_error(e, "update_measurement_config_by_id")
    except Exception as e:
        return handle_error(e, "update_measurement_config_by_id")

def update_measurement_config(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        logger.info(f"Update config request body: {body}")
        garment_type = body.get("garmentType")
        measurements = body.get("measurements", body.get("fields", []))
        logger.info(f"Parsed measurements for update: {measurements}")

        if not garment_type:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Garment type is required for update."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        now = int(time.time())

        update_expression = "SET measurements = :measurements, updated_at = :updatedAt"
        expression_attribute_values = {
            ":measurements": measurements,
            ":updatedAt": now,
        }

        response = measurement_configs_table.update_item(
            Key={"garment_type": garment_type},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
        )

        updated_item = response.get("Attributes")
        logger.info(f"Updated measurement config: {updated_item}")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "id": updated_item["garment_type"],  # Include id for frontend compatibility
                "garmentType": updated_item["garment_type"],
                "measurements": updated_item.get("measurements"),
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
                "body": json.dumps({"error": "Measurement config not found."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }
        return handle_error(e, "update_measurement_config")
    except Exception as e:
        return handle_error(e, "update_measurement_config")

def delete_measurement_config(event, context):
    try:
        garment_type = event["pathParameters"]["id"]
        if not garment_type:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Garment type is required for deletion."}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            }

        measurement_configs_table.delete_item(Key={"garment_type": garment_type})

        logger.info(f"Deleted measurement config with Garment Type: {garment_type}")
        return {
            "statusCode": 200,
            "body": json.dumps("Measurement config deleted successfully!"),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        }
    except Exception as e:
        return handle_error(e, "delete_measurement_config")

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    http_method = event.get("httpMethod")
    path = event.get("path")

    if path == "/measurement-configs":
        if http_method == "GET":
            return get_measurement_configs(event, context)
        elif http_method == "POST":
            return add_measurement_config(event, context)
        elif http_method == "PUT":
            return update_measurement_config(event, context)
        elif http_method == "OPTIONS":
            return handle_options(event, context)
    elif path.startswith("/measurement-configs/"):
        if http_method == "PUT":
            return update_measurement_config_by_id(event, context)
        elif http_method == "DELETE":
            return delete_measurement_config(event, context)
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
