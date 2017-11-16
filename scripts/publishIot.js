var awsIot = require('aws-iot-device-sdk');
var device = awsIot.device({
   keyPath: '../iot/serverless-auth.private.key',
  certPath: '../iot/serverless-auth.cert.pem',
    caPath: '../iot/root-CA.crt',
  clientId: 'serverless-auth-pub',
      host: 'a2d36hv5oulwb1.iot.us-west-2.amazonaws.com'
});

console.log('Attempting to connect...');
device
  .on('connect', function() {
    console.log('connect');
    //device.subscribe('funds/#');
    console.log("Publishing test messages to books");
    device.publish('fund1/book1', JSON.stringify({ test_data: "1/1"}));
    device.publish('fund1/book2', JSON.stringify({ test_data: "1/2"}));
    device.publish('fund1/book3', JSON.stringify({ test_data: "1/3"}));
    device.publish('fund2/book1', JSON.stringify({ test_data: "2/1"}));
    device.publish('fund2/book2', JSON.stringify({ test_data: "2/2"}));
    device.publish('fund2/book3', JSON.stringify({ test_data: "2/3"}));
    device.publish('fund3/book1', JSON.stringify({ test_data: "3/1"}));
    device.publish('fund3/book2', JSON.stringify({ test_data: "3/2"}));
    device.publish('fund3/book3', JSON.stringify({ test_data: "3/3"}));
    console.log("finished writing messages... press ctrl-c to quit...");
  });
