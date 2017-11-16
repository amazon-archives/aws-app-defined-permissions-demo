var AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_REGION;

var fs = require('fs');

var params = {
  setAsActive: true
};
var iot = new AWS.Iot();
console.log("Setting up keys and certificate...");
iot.createKeysAndCertificate(params, function(err, data) {
  if (err) console.log(err, err.stack);
  else {
    //console.log(data);
    console.log("Created certificate: " + data.certificateId);
    certificateArn = data.certificateArn;
    fs.writeFile("../iot/serverless-auth.cert.pem", data.certificatePem, function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("Saved certificate pem");
    });

    fs.writeFile("../iot/serverless-auth.public.key", data.keyPair.PublicKey, function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("Saved public key");
    });

    fs.writeFile("../iot/serverless-auth.private.key", data.keyPair.PrivateKey, function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("Saved private key");
    });

  }
});
