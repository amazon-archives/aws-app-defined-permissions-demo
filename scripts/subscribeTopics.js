var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
var async = require('async');

var apigClientFactory = require('aws-api-gateway-client').default;

const AWSCognito = require('amazon-cognito-identity-js');

// Accept username and password as command line parameters
var username = process.argv[2];
var password =process.argv[3];

var authenticationData = {
    Username : username,
    Password : password,
};
var authenticationDetails = new AWSCognito.AuthenticationDetails(authenticationData);

var apiEndpoint = "";
var clientId = "";
var userPoolId = "";

var cloudformation = new AWS.CloudFormation();

async.waterfall([
  function getApiEndpoint(next) {
    var params = {
      LogicalResourceId: 'RestApi', /* required */
      StackName: 'serverless-auth' /* required */
    };
    cloudformation.describeStackResource(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
        //console.log(data);           // successful response
        var api = data.StackResourceDetail.PhysicalResourceId;
        apiEndpoint = 'https://' + api + '.execute-api.us-west-2.amazonaws.com/Prod';
        console.log("API Endpoint: " + apiEndpoint);
      }
      next(null, apiEndpoint);
    });

  },
  function getUserpoolId(apiEndpoint, next) {
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
      next(null, apiEndpoint, userPoolId);
    });
  },
  function getClientId(apiEndpoint, userPoolId, next) {
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
      next(null, apiEndpoint, userPoolId, clientId);
    });
  },
  function subscribeTopics(apiEndpoint, userPoolId, clientId, next) {
    var poolData = {
        UserPoolId : userPoolId, // Your user pool id here
        ClientId : clientId // Your client id here
    };
    var userPool = new AWSCognito.CognitoUserPool(poolData);
    var userData = {
        Username : username,
        Pool : userPool
    };

    var cognitoUser = new AWSCognito.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            //console.log('id token + ' + result.getIdToken().getJwtToken());
            //console.log('access token + ' + result.getAccessToken().getJwtToken());

            //POTENTIAL: Region needs to be set if not already set previously elsewhere.
            //AWS.config.region = '<region>';

            // Instantiate API Gateway with the token in authorization header
            config = {invokeUrl: apiEndpoint};
            var apigClient = apigClientFactory.newClient(config);

            var params = {
                //This is where any header, path, or querystring request params go. The key is the parameter named as defined in the API
                //userId: '1234',
              };
            // Template syntax follows url-template https://www.npmjs.com/package/url-template
            var pathTemplate = '/subscribe'
            var method = 'POST';
            var additionalParams = {
                //If there are any unmodeled query parameters or headers that need to be sent with the request you can add them here
                headers: {
                    'Authorization': result.getIdToken().getJwtToken()
                }
            };
            var body = {
                //This is where you define the body of the request
                //Item: {
                  clientid: username,
                  //topics: process.argv.slice(4, process.argv.length + 1)
                  topic: process.argv[4]
                //}
            };

            console.log("invoking api...");
            apigClient.invokeApi(params, pathTemplate, method, additionalParams, body)
                .then(function(result){
                    console.log("Successfully updated topic subscription for " + username);
                    next(null);
                }).catch( function(result){
                    console.log("Error updating topic subscription for " + username);
                    console.log(result);
                    next("Error");
                });

        },

        onFailure: function(err) {
            next(err);
        },

    });
  }
], function (err) {
  if (err) {
    console.log(err);
  }
  console.log("Done!");
});
