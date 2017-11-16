import boto3
import json
import os

from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime

print('Loading function')
aws_region = os.environ['AWS_DEFAULT_REGION']
dynamodb = boto3.resource('dynamodb')
sts = boto3.client('sts')
cognito = boto3.client('cognito-idp')

subscription_table = dynamodb.Table(os.environ['SUBSCRIPTION_TABLE'])


def respond(err, res=None):
    return {
        'statusCode': err['code'] if err else '200',
        'body': err['message'] if err else json.dumps(
            res,
            default=datetime_handler),
        'headers': {
            'Content-Type': 'application/json',
        },
    }

# json does not have a default datetime
def datetime_handler(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError("Type {} not serializable".format(type(obj)))


def lambda_handler(event, context):
    '''Scans the topic subscription dynamodb table and builds a
    custom IAM policy based on subscriptions.
    '''
    print("Received event: " + json.dumps(event, indent=2))
    print("Received context: " + str( vars(context) ))

    operation = event["http_method"]
    book = event["book"]
    acc_id = context.invoked_function_arn.split(":")[4]

    response = cognito.list_users(
        UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
        Filter='sub = "{}"'.format(event["context"]["sub"])
    )
    print(response)

    client_id = response["Users"][0]["Username"]

    if operation == 'GET':
        response = subscription_table.get_item(
            Key={
                'clientid' : client_id,
                'topic' : book
            }
        )

        print(response)
        topic_policy = ''

        # if no records are returned, deny access
        if not response or "Item" not in response:
            return respond({'code': '403', 'message': 'Forbidden'})
        else:
            topic = "arn:aws:iot:{}:{}:topic/{}".format(aws_region, acc_id, book)
            topic_filter = "arn:aws:iot:{}:{}:topicfilter/{}".format(aws_region, acc_id, book)

            # Create a policy
            topic_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": "iot:Connect",
                        "Resource": "*"
                    },
                    {
                        "Effect": "Allow",
                        "Action": "iot:Subscribe",
                        "Resource": topic_filter
                    },
                    {
                        "Effect": "Allow",
                        "Action": "iot:Receive",
                        "Resource": topic
                    }
                ]
            }
            print(json.dumps(topic_policy))

        assumed_role = sts.assume_role(
            RoleArn='arn:aws:iam::{}:role/{}'.format(acc_id, os.environ['IOT_ROLE']),
            RoleSessionName='{}_session'.format(client_id),
            Policy=json.dumps(topic_policy)
        )
        temp_creds = assumed_role['Credentials']
        temp_creds['Topics'] = book

        return respond(None, temp_creds)
    else:
        return respond({'code': '400', 'message': ValueError('Unsupported method "{}"'.format(operation))})

