var AWS = require('aws-sdk');
var async = require('async');

AWS.config.region = process.env.AWS_REGION;

const AWSCognito = require('amazon-cognito-identity-js');

// The Cognito SDK does not seem to provide an admin confirm option
// Using the AWS SDK instead to confirm newly created users
var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

// Accept username and password as command line parameters
var username = process.argv[2];
var password =process.argv[3];

var attributeList = [];

var dataEmail = {
    Name : 'email',
    Value : 'email@mydomain.com'
};

var dataPhoneNumber = {
    Name : 'phone_number',
    Value : '+15555555555'
};

var attributeEmail = new AWSCognito.CognitoUserAttribute(dataEmail);
var attributePhoneNumber = new AWSCognito.CognitoUserAttribute(dataPhoneNumber);

attributeList.push(attributeEmail);
attributeList.push(attributePhoneNumber);

var clientId = "";
var userPoolId = "";

var cloudformation = new AWS.CloudFormation();

async.waterfall([
  function getUserpoolId(next) {
    var params = {
      LogicalResourceId: 'CognitoUserPool', /* required */
      StackName: 'serverless-auth' /* required */
    };
    cloudformation.describeStackResource(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
        //console.log(data);           // successful response
        userPoolId = data.StackResourceDetail.PhysicalResourceId;
        console.log("User pool ID: " + userPoolId);
      }
      next(null, userPoolId);
    });
  },
  function getClientId(userPoolId, next) {
    var params = {
      LogicalResourceId: 'CognitoUserPoolClient', /* required */
      StackName: 'serverless-auth' /* required */
    };
    cloudformation.describeStackResource(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
        //console.log(data);           // successful response
        clientId = data.StackResourceDetail.PhysicalResourceId;
        console.log("Client ID: " + clientId);
      }
      next(null, userPoolId, clientId);
    });
  },
  function createUsers(userPoolId, clientId, next) {
    var poolData = {
        UserPoolId : userPoolId, // Your user pool id here
        ClientId : clientId // Your client id here
    };
    var userPool = new AWSCognito.CognitoUserPool(poolData);
    var userData = {
        Username : username,
        Pool : userPool
    };

    userPool.signUp(username, password, attributeList, null, function(err, result){
        if (err) {
            console.log(err, err.stack);
            return;
        }
        //console.log(result);
        cognitoUser = result.user;

        var confirmationData = {
            UserPoolId: userPoolId,
            Username: username
        };
        // Confirm user
        cognitoidentityserviceprovider.adminConfirmSignUp(confirmationData, function(err, data) {
            if (err) {
              console.log(err, err.stack);
            }
            else {
              //console.log(data);
              console.log('Successfully set up user');
            }
        });
    });

  }
], function (err) {
  if (err) {
    console.log(err);
  }
  console.log("Done!");
});
