#! /bin/bash

set -x

source ./env_vars.sh

aws cloudformation package --region $AWS_REGION --s3-bucket $CF_BUCKET --template $CF_TEMPLATE --output-template-file $CF_TEMPLATE_OUTPUT
aws cloudformation deploy --region $AWS_REGION --template-file $CF_TEMPLATE_OUTPUT --stack-name serverless-auth --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --parameter-overrides CertificateId=$CERTIFICATE_ID
