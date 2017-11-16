# Combining static IAM roles with application logic to create application-defined, dynamic, bespoke access to AWS resources at scale.

When you develop applications using Amazon Cognito you can grant end users direct access to AWS resources using temporary credentials based on their group membership.  This is a great mechanism to reduce server load, simplify applications, maintain security and deliver solutions quickly.  When working at scale, with hundreds of users or thousands of resources, there are challenges to overcome.  Within a single AWS account, you are limited to 500 IAM roles and the total size of all policies attached to a role must be less than 10k.  For large applications, these limits can quickly become a challenge for role-based permissions or resource-based permissions.

In this blog post we will describe a solution that generates bespoke IAM policies either at login time or at the point of accessing a resource within a serverless web application.  The access control is templated from normal IAM policies, but it ultimately application-defined.  This allows far greater flexibility around controlling which users have access to which AWS resources.  We will show how this solution helped AMaaS, an Asset Management as a Service startup, to let their customers control their own security settings while enabling AMaaS to leverage innovate services like AWS IoT for push updates.


## Deploying the solution

### Pre-requisites
* node

### IoT Thing
Run the commands below from the root folder.
* Set up certificate. Make note of the Certificate ID.
  `cd scripts`
  `node configureCert.js`

* Download the root CA certificate
  `cd iot`
  `./download-root-cert.sh`

### Backend
* The backend is deployed using CLoudFormation templates. Navigate to the cloudformation folder. Copy env_vars.sh.sample as env_vars.sh. Update the S3 bucket name used to store the CloudFormation templates, the certificate ID from the steo above and optionally the region. Run the script deploy.sh.
* Update the trust policy of the Default IoT role to allow Lambda to use it with AWS STS. It is not possible to set this up via Cloudformation because it results in a circular dependency. This is what the policy would look like.

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com",
        "AWS": "arn:aws:sts::<ACCOUNT_ID>:assumed-role/policy-generator-role/<LAMBDA_NAME>"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Reference data
Use scripts below to set up Cognito users (traders) and example topic (book) subscriptions. The environment variable AWS_REGION must be set.
* Set up users
  `while read -r LINE; do node createUsers.js $LINE; done < users.txt`

* Set up subscriptions
  `while read -r LINE; do node subscribeTopics.js $LINE; done < subscriptions.txt`

### Testing the Solution
* Simulate message subscription. Publish messages using script below
  `node publishIot.js`

  Subscribe to messages for a specific customer using the script below. You should only see messages published to the book trader is subscribed to.
  `node fetchUpdates.js fund1_trader1 Fund1_U5ser_1@ fund1/book1`
