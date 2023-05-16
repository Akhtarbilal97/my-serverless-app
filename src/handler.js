const AWS = require("aws-sdk");
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB();

module.exports.signUp = async (event, context) => {
  const { email, password, name, phone_number } = JSON.parse(event.body);
  const userPoolId = process.env.MY_USER_POOL_ID;
  const clientId = process.env.MY_USER_POOL_CLIENT_ID;

  const params = {
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "name",
        Value: name,
      },
      {
        Name: "phone_number",
        Value: phone_number,
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
        name: { S: name },
        phone_number: { S: phone_number },
      },
    };
    await dynamodb.putItem(dbParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "A confirmation mail has been send to your email.",
        status: "successfull",
      }),
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
      body: JSON.stringify({
        message: "Your user has been successfully signUp.",
        status: "successfull",
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// Update Password

module.exports.updatePassword = async (event, context) => {
  const { email, oldpassword, newpassword } = JSON.parse(event.body);
  const userPoolId = process.env.MY_USER_POOL_ID;

  const params = {
    UserPoolId: "us-east-1_37UKv1S3E",
    Username: email,
    Password: newpassword,
    Permanent: true,
  };

  try {
    // Authenticate the user with their old password
    const authParams = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.MY_USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: oldpassword,
      },
    };
    const authResult = await cognito.initiateAuth(authParams).promise();

    // Set the new password for the user
    await cognito.adminSetUserPassword(params).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "Password updated successfully",
      }),
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



const { v4: uuidv4 } = require("uuid");
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient(); // Create a DynamoDB instance

module.exports.uploadFile = async (event, context) => {
  const fileContent = Buffer.from(event.body, "base64");
  const fileName = event.queryStringParameters.filename;
  const bucketName ="my-serverless-app-dev-serverlessdeploymentbucket-ew2x60uk92zg";
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

    // Store user data in DynamoDB
    const fileData = {
      id: uuidv4(),
      title: "My file title",
      description: "A brief description of my file",
      type: fileType,
      category_id: null,
      fileType: null,
      previewUrl: null,
      fileUrl: `https://${bucketName}.s3.amazonaws.com/${fileName}`,
      isPremium: false,
      likesCount: 0,
      viewsCount: 0,
    };
    const dynamoDBParams = {
      TableName: "assets-table",
      Item: fileData,
    };
    await dynamoDB.put(dynamoDBParams).promise();

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


// module.exports.SearchService = async (event) => {
//   try {
//     console.log("Received event:", JSON.stringify(event));

//     const { queryStringParameters } = event;
//     const { title } = queryStringParameters;

//     console.log("title:", title);

//     const searchParams = {
//       TableName: "assets-table",
//       FilterExpression: "contains(#title, :title)",
//       ExpressionAttributeNames: {
//         "#title": "title",
//       },
//       ExpressionAttributeValues: {
//         ":title": title,
//       },
//     };

//     const searchResults = await dynamoDB.scan(searchParams).promise();

//     return {
//       statusCode: 200,
//       body: JSON.stringify(searchResults),
//     };
//   } catch (error) {
//     console.error(error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: "Internal server error" }),
//     };
//   }
// };



module.exports.SearchService = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event));

    const { queryStringParameters } = event;
    const { title, description, type, category_id, isPremium } =
      queryStringParameters;

    console.log("title:", title);

    const searchParams = {
      TableName: "assets-table",
      FilterExpression:
        "contains(#title, :title) OR contains(#description, :description) OR #type = :type OR #category_id = :category_id OR #isPremium = :isPremium",
      ExpressionAttributeNames: {
        "#title": "title",
        "#description": "description",
        "#type": "type",
        "#category_id": "category_id",
        "#isPremium": "isPremium",
      },
      ExpressionAttributeValues: {
        ":title": title,
        ":description": description,
        ":type": type,
        ":category_id": category_id,
        ":isPremium": isPremium,
      },
    };

    const searchResults = await dynamoDB.scan(searchParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(searchResults),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
