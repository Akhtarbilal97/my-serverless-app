const AWS = require("aws-sdk");
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB();

module.exports.signUp = async (event, context) => {
  const { email, password, UserName } = JSON.parse(event.body);
  const userPoolId = process.env.MY_USER_POOL_ID;
  const clientId = process.env.MY_USER_POOL_CLIENT_ID;

  const params = {
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "given_name", // First name
        Value: username,
      },

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
        username: { S: username },
      },
    };
    await dynamodb.putItem(dbParams).promise();

    return {
      statusCode: 200,
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
      body: JSON.stringify({ message: "User confirmed successfully." }),
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
