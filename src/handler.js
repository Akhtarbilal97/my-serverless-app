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


// const { v4: uuidv4 } = require("uuid");
//   // const AWS = require("aws-sdk");
// const s3 = new AWS.S3();
// const dynamoDB = new AWS.DynamoDB.DocumentClient();

// // // upload file api
// module.exports.uploadFile = async (event, context) => {
//   try {
//     if (!event.body) {
//       throw new Error("Missing file content");
//     }

//     const fileContent = Buffer.from(event.body, "base64");
//     const fileName = event.queryStringParameters.filename || "defaultFilename";
//     const bucketName =
//       "my-serverless-app-dev-serverlessdeploymentbucket-ew2x60uk92zg";
//     const fileType = fileName.split(".")[1];

//     const params = {
//       Bucket: bucketName,
//       Key: fileName,
//       Body: fileContent,
//       ContentType: `application/${fileType}`,
//       ACL: "public-read",
//     };

//     const result = await s3.upload(params).promise();
//     console.log(`File uploaded successfully to ${result.Location}`);

//     // Parse the metadata from the request body
//     const metadata = JSON.parse(event.body);

//     const fileData = {
//       id: uuidv4(),
//       title: metadata.title || "",
//       description: metadata.description || "",
//       category: metadata.category || "",
//       tools: metadata.tools || "",
//       tags: metadata.tags || "",
//       fileurl: metadata.fileurl || "",
//       url: `https://${bucketName}.s3.amazonaws.com/${fileName}`,
//       shop: metadata.shop || "",
//       sourcefile: metadata.sourcefile || "",
//     };

//     const dynamoDBParams = {
//       TableName: "assets-table",
//       Item: fileData,
//     };

//     const dynamoDBResponse = await dynamoDB.put(dynamoDBParams).promise();
//     console.log("Metadata saved to DynamoDB:", dynamoDBResponse);

//     return {
//       statusCode: 205,
//       headers: {
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Credentials": true,
//       },
//       body: JSON.stringify({
//         message: "File uploaded successfully",
//         status: "success",
//       }),
//     };
//   } catch (error) {
//     console.error(error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: "Failed to upload file" }),
//     };
//   }
// };

const { v4: uuidv4 } = require("uuid");
// const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports.uploadFile = async (event, context) => {
  try {
    if (!event.body) {
      throw new Error("Missing file content");
    }

    const fileContent = Buffer.from(event.body, "base64");
    const fileName = event.queryStringParameters.filename || "defaultFilename";
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

    const result = await s3.upload(params).promise();
    console.log(`File uploaded successfully to ${result.Location}`);

    const metadata = JSON.parse(event.body);

    const categoryData = {
      id: uuidv4(),
      name: metadata.category || "",
    };

    const categoryParams = {
      TableName: "new-category-table",
      Item: categoryData,
    };

    const categoryResponse = await dynamoDB.put(categoryParams).promise();
    console.log("Category data saved to DynamoDB:", categoryResponse);

    const fileData = {
      id: uuidv4(),
      title: metadata.title || "",
      description: metadata.description || "",
      category: categoryData.id, // Save the category ID in the assets table
      tools: metadata.tools || "",
      tags: metadata.tags || "",
      fileurl: metadata.fileurl || "",
      url: `https://${bucketName}.s3.amazonaws.com/${fileName}`,
      shop: metadata.shop || "",
      sourcefile: metadata.sourcefile || "",
    };

    const assetParams = {
      TableName: "assets-table",
      Item: fileData,
    };

    const assetResponse = await dynamoDB.put(assetParams).promise();
    console.log("Asset data saved to DynamoDB:", assetResponse);

    return {
      statusCode: 205,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "File uploaded successfully",
        status: "success",
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to upload file" }),
    };
  }
};



// Create File
module.exports.getFile = async (event, context) => {
  try {
    const fileId = event.queryStringParameters.id;

    const dynamoDBParams = {
      TableName: "assets-table",
      Key: {
        id: fileId,
      },
    };

    const dynamoDBResponse = await dynamoDB.get(dynamoDBParams).promise();
    const fileData = dynamoDBResponse.Item;

    if (!fileData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "File not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(fileData),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to retrieve file" }),
    };
  }
};

// Update Assets

module.exports.updateFile = async (event, context) => {
  try {
    if (!event.body) {
      throw new Error("Missing update data");
    }

    // Parse the update data from the request body
    const updateData = JSON.parse(event.body);

    const fileId = updateData.id;
    if (!fileId) {
      throw new Error("Missing file ID");
    }

    const dynamoDBParams = {
      TableName: "assets-table",
      Key: { id: fileId },
      UpdateExpression:
        "set title = :title, description = :description, tools = :tools, tags = :tags",
      ExpressionAttributeValues: {
        ":title": updateData.title || "",
        ":description": updateData.description || "",
        ":tools": updateData.tools || "",
        ":tags": updateData.tags || "",
      },
      ReturnValues: "ALL_NEW",
    };

    const dynamoDBResponse = await dynamoDB.update(dynamoDBParams).promise();
    console.log("Metadata updated in DynamoDB:", dynamoDBResponse);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "File metadata updated successfully",
        status: "success",
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update file metadata" }),
    };
  }
};

// deletefile

module.exports.deleteFile = async (event, context) => {
  try {
    const fileId = event.queryStringParameters.id;

    const dynamoDBParams = {
      TableName: "assets-table",
      Key: {
        id: fileId,
      },
    };

    const dynamoDBResponse = await dynamoDB.delete(dynamoDBParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "File deleted successfully" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to delete file" }),
    };
  }
};



// category tables
// const dynamoDb = new AWS.DynamoDB.DocumentClient();
// const uuid = require("uuid");
// module.exports.createCategory = async (event, context) => {
//   const { name } = JSON.parse(event.body);

//   const category = {
//     id: uuid.v1(),
//     name,
//   };

//   const params = {
//     TableName: "new-category-table",
//     Item: category,
//   };

//   try {
//     await dynamoDb.put(params).promise();
//     return {
//       statusCode: 201,
//       body: JSON.stringify(category),
//     };
//   } catch (error) {
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: "Could not create category" }),
//     };
//   }
// };


// get Category
module.exports.getCategory = async (event, context) => {
  const { id } = event.queryStringParameters;

  const params = {
    TableName: "new-category-table",
    Key: {
      id: id,
    },
  };

  try {
    const result = await dynamoDb.get(params).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Category not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not retrieve category" }),
    };
  }
};



// Tools Table
// const uuid = require("uuid");
// module.exports.createTools = async (event, context) => {
//   const { name } = JSON.parse(event.body);

//   const tools = {
//     id: uuid.v1(),
//     name,
//   };

//   const params = {
//     TableName: "new-tools-table",
//     Item: tools,
//   };

//   try {
//     await dynamoDb.put(params).promise();
//     return {
//       statusCode: 201,
//       body: JSON.stringify(tools),
//     };
//   } catch (error) {
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: "Could not create tools" }),
//     };
//   }
// };

// get Category
module.exports.getTools = async (event, context) => {
  const { id } = event.queryStringParameters;

  const params = {
    TableName: "new-tools-table",
    Key: {
      id: id,
    },
  };

  try {
    const result = await dynamoDb.get(params).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Tools not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not retrieve tools" }),
    };
  }
};



 //  Search Service

module.exports.SearchService = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event));

    const { queryStringParameters } = event;
    const { title, description, type, isPremium } = queryStringParameters;

    console.log("title:", title);

    const searchParams = {
      TableName: "assets-table",
      FilterExpression:
        "contains(#title, :title) OR contains(#description, :description) OR #type = :type OR #isPremium = :isPremium",
      ExpressionAttributeNames: {
        "#title": "title",
        "#description": "description",
        "#type": "type",
        "#isPremium": "isPremium",
      },
      ExpressionAttributeValues: {
        ":title": title,
        ":description": description,
        ":type": type,
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
