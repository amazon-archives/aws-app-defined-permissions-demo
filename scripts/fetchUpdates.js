var AWS = require('aws-sdk');
var async = require('async');

var awsCognito = require('amazon-cognito-identity-js');
var apigClientFactory = require('aws-api-gateway-client').default;
var awsIot = require('aws-iot-device-sdk');

var region = process.env.AWS_REGION;
AWS.config.region = region;

// Accept username and password as command line parameters
var username = process.argv[2];
var password = process.argv[3];
var bookname = process.argv[4];

var authenticationData = {
    Username : username,
    Password : password,
};
var authenticationDetails = new awsCognito.AuthenticationDetails(authenticationData);

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
        apiEndpoint = 'https://' + api + '.execute-api.' + region + '.amazonaws.com/Prod';
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
  function getUpdates(apiEndpoint, userPoolId, clientId, next) {
    var poolData = {
        UserPoolId : userPoolId, // Your user pool id here
        ClientId : clientId // Your client id here
    };
    var userPool = new awsCognito.CognitoUserPool(poolData);
    var userData = {
        Username : username,
        Pool : userPool
    };

    var cognitoUser = new awsCognito.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            config = {invokeUrl:apiEndpoint};
            var apigClient = apigClientFactory.newClient(config);

            var params = { };
            var pathTemplate = '/policy'
            var method = 'GET';
            var additionalParams = {
                headers: {
                    'Authorization': result.getIdToken().getJwtToken()
                },
                queryParams: {
                    'book': bookname
                }
            };
            var body = { };

            apigClient.invokeApi(params, pathTemplate, method, additionalParams, body)
                .then(function(result){
                    if (result.data.statusCode == 403) {
                        console.log("trader is not authorised to subscribe to that book");
                        return;
                    }
                    body = JSON.parse(result.data.body);
                    topic = body.Topics;

                    var device = awsIot.device({
                      clientId: 'serverless-auth-sub',
                      host:     'a2ytvqq9j4ppeo.iot.us-west-2.amazonaws.com',
                      protocol: 'wss',
                      accessKeyId:  body.AccessKeyId,
                      secretKey:    body.SecretAccessKey,
                      sessionToken: body.SessionToken
                    });

                    device
                      .on('connect', function() {
                        console.log('connected to iot');
                        device.subscribe(topic);
                        console.log("Subscribed to " + topic);
                      });
                    device
                      .on('message', function(topic, payload) {
                        console.log('message', topic, payload.toString());
                        next(null);
                      });

                }).catch( function(result){
                    console.log("Error fetching policy");
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
  console.log("press ctrl-c to quit...");
});
