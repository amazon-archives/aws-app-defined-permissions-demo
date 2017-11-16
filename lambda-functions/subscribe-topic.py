
import boto3
import json
import os
import uuid

print('Loading function')
subscription_table = os.environ['SUBSCRIPTION_TABLE']
dynamodb = boto3.resource('dynamodb')
dynamo = dynamodb.Table(subscription_table)


def respond(err, res=None):
    print("Inside respond")
    print(json.dumps(res))
    return {
        'statusCode': '400' if err else '200',
        'body': err.message if err else json.dumps(res),
        'headers': {
            'Content-Type': 'application/json'
        }
    }


def lambda_handler(event, context):
    '''Allows storing and mofidying trader permissions to books in a
    DynamoDB table specified as an environment variable to the Lambda
    function.

    To put, update, or delete an item, make a POST, PUT, or DELETE request
    respectively, passing in the payload to the DynamoDB API as a JSON body.
    '''
    print("Received event: " + json.dumps(event, indent=2))
    print("Received context: " + str( vars(context) ))

    operations = {
        'DELETE': lambda dynamo, x: dynamo.delete_item(**x),
        'GET': lambda dynamo, x: dynamo.scan(**x),
        'POST': lambda dynamo, x: dynamo.put_item(**x),
        'PUT': lambda dynamo, x: dynamo.update_item(**x),
    }

    operation = event["http_method"]
    payload = ''

    if operation in operations:
        if operation == 'GET':
            payload = event["body"]["clientid"]
        else:
            #event["body"]["clientid"] = uuid.uuid4().hex
            payload = dict(Item=event["body"])

        return respond(None, operations[operation](dynamo, payload))
    else:
        return respond(ValueError('Unsupported method "{}"'.format(operation)))
