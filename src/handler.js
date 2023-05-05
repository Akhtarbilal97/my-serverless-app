const AWS = require("aws-sdk");
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB();

module.exports.signUp = async (event, context) => {
  const { email, password, } = JSON.parse(event.body);
  const userPoolId = process.env.MY_USER_POOL_ID;
  const clientId = process.env.MY_USER_POOL_CLIENT_ID;

  const params = {
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      // {
      //   Name: "given_name", // First name
      //   Value: username,
      // },

      {
        Name: "email",
        Value: email,
      },
    ],
  };

  try {
    // Sign up the user with Cognito
    await cognito.signUp(params).promise();

    // Save the user data to DynamoDB
    const dbParams = {
      TableName: "user-table",
      Item: {
        email: { S: email },
        // username: { S: username },
      },
    };
    await dynamodb.putItem(dbParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "User signed up successfully." }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

module.exports.confirmSignUp = async (event, context) => {
  const { email, confirmationcode } = JSON.parse(event.body);
  const userPoolId = process.env.MY_USER_POOL_ID;
  const clientId = process.env.MY_USER_POOL_CLIENT_ID;

  const params = {
    ClientId: clientId,
    Username: email,
    ConfirmationCode: confirmationcode,
  };

  try {
    await cognito.confirmSignUp(params).promise();
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Successfully SignUp." }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

module.exports.signIn = async (event, context) => {
  const { email, password } = JSON.parse(event.body);
  const userPoolId = process.env.MY_USER_POOL_ID;
  const clientId = process.env.MY_USER_POOL_CLIENT_ID;

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  try {
    const result = await cognito.initiateAuth(params).promise();
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        access_token: result.AuthenticationResult.AccessToken,
      }),
    };
  } catch (error) {
    if (error.message === "User is not confirmed.") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            "Please check your email for the verification code to activate your account.",
        }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.message }),
      };
    }
  }
};

// Upload File Function
const s3 = new AWS.S3();
module.exports.uploadFile = async (event, context) => {
  const fileContent = Buffer.from(event.body, "base64");
  const fileName = event.queryStringParameters.filename;
  const bucketName =
    "my-serverless-app-dev-serverlessdeploymentbucket-ew2x60uk92zg";
  const fileType = fileName.split(".")[1];

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent,
    ContentType: `application/${fileType}`,
    ACL: "public-read",
  };

  try {
    const result = await s3.upload(params).promise();
    console.log(`File uploaded successfully to ${result.Location}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File uploaded successfully" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to upload file" }),
    };
  }
};
