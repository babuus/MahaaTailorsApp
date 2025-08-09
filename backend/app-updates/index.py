import json
import boto3
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

# Environment variables
UPDATES_TABLE = os.environ.get('UPDATES_TABLE', 'mahaa-app-updates')
UPDATES_BUCKET = os.environ.get('UPDATES_BUCKET', 'mahaatailors-frontend-dev')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle app update requests
    """
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        if http_method == 'GET' and '/check-updates' in path:
            return check_for_updates(event)
        elif http_method == 'GET' and '/download-update' in path:
            return download_update(event)
        elif http_method == 'POST' and '/register-version' in path:
            return register_version(event)
        else:
            return create_response(404, {'error': 'Endpoint not found'})
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def check_for_updates(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if updates are available for the app
    """
    try:
        query_params = event.get('queryStringParameters') or {}
        current_version = query_params.get('version', '0.0.1')
        platform = query_params.get('platform', 'android')
        component = query_params.get('component', 'all')
        
        table = dynamodb.Table(UPDATES_TABLE)
        
        # Get latest version info
        response = table.scan(
            FilterExpression='platform = :platform AND component = :component',
            ExpressionAttributeValues={
                ':platform': platform,
                ':component': component
            }
        )
        
        updates_available = []
        
        for item in response['Items']:
            if is_version_newer(item['version'], current_version):
                update_info = {
                    'version': item['version'],
                    'component': item['component'],
                    'description': item.get('description', ''),
                    'size': item.get('size', 0),
                    'critical': item.get('critical', False),
                    'download_url': item.get('download_url', ''),
                    'checksum': item.get('checksum', ''),
                    'release_date': item.get('release_date', ''),
                    'dependencies': item.get('dependencies', [])
                }
                updates_available.append(update_info)
        
        # Sort by version (newest first)
        updates_available.sort(key=lambda x: x['version'], reverse=True)
        
        return create_response(200, {
            'has_updates': len(updates_available) > 0,
            'current_version': current_version,
            'updates': updates_available
        })
        
    except Exception as e:
        print(f"Error checking updates: {str(e)}")
        return create_response(500, {'error': 'Failed to check updates'})

def download_update(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate presigned URL for downloading update
    """
    try:
        query_params = event.get('queryStringParameters') or {}
        version = query_params.get('version')
        component = query_params.get('component', 'all')
        platform = query_params.get('platform', 'android')
        
        if not version:
            return create_response(400, {'error': 'Version parameter required'})
        
        # Generate S3 key (using mobile/ prefix for consistency with frontend bucket)
        s3_key = f"mobile/updates/{platform}/{component}/{version}/update.zip"
        
        # Generate presigned URL (valid for 1 hour)
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': UPDATES_BUCKET, 'Key': s3_key},
            ExpiresIn=3600
        )
        
        return create_response(200, {
            'download_url': presigned_url,
            'expires_in': 3600
        })
        
    except Exception as e:
        print(f"Error generating download URL: {str(e)}")
        return create_response(500, {'error': 'Failed to generate download URL'})

def register_version(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Register a new version (admin endpoint)
    """
    try:
        body = json.loads(event.get('body', '{}'))
        
        required_fields = ['version', 'platform', 'component']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        table = dynamodb.Table(UPDATES_TABLE)
        
        item = {
            'id': f"{body['platform']}#{body['component']}#{body['version']}",
            'version': body['version'],
            'platform': body['platform'],
            'component': body['component'],
            'description': body.get('description', ''),
            'size': body.get('size', 0),
            'critical': body.get('critical', False),
            'download_url': body.get('download_url', ''),
            'checksum': body.get('checksum', ''),
            'dependencies': body.get('dependencies', []),
            'release_date': datetime.now(timezone.utc).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        table.put_item(Item=item)
        
        return create_response(201, {'message': 'Version registered successfully'})
        
    except Exception as e:
        print(f"Error registering version: {str(e)}")
        return create_response(500, {'error': 'Failed to register version'})

def is_version_newer(version1: str, version2: str) -> bool:
    """
    Compare two version strings (semantic versioning)
    Returns True if version1 is newer than version2
    """
    try:
        v1_parts = [int(x) for x in version1.split('.')]
        v2_parts = [int(x) for x in version2.split('.')]
        
        # Pad shorter version with zeros
        max_len = max(len(v1_parts), len(v2_parts))
        v1_parts.extend([0] * (max_len - len(v1_parts)))
        v2_parts.extend([0] * (max_len - len(v2_parts)))
        
        for i in range(max_len):
            if v1_parts[i] > v2_parts[i]:
                return True
            elif v1_parts[i] < v2_parts[i]:
                return False
        
        return False
        
    except Exception:
        return False

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create standardized API response
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        'body': json.dumps(body)
    }