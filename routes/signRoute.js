const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk')
const {OAuth2Client} = require('google-auth-library')
const axios = require('axios');
AWS.config.update({region : 'ap-south-1'})


const db = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const googleClientID = "923862509191-lss5f0b0vs8itucpv0o2enc4j12qmrtk.apps.googleusercontent.com"
const client = new OAuth2Client(googleClientID);
const redisClient = require('../redisClient');

const setUserLoginStatus = async (username, status) => {
    await redisClient.set(username, status, 'EX', 86400 * 10); // Expires in 1 hour
};


router.post('/logout', async (req, res) => {
    const { username } = req.body;

    try {
        // Remove the user's login status from Redis
        await redisClient.del(username); 

        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        console.error('Error during logout: ', error);
        res.status(500).json({ error: `Logout error: ${error.message}` });
    }
});


router.get('/loginstatus', async (req,res) => {
    const { username } = req.query

    try {
        const loginStatus = await redisClient.get(username)

        if (loginStatus) {
            return res.status(200).json({ message: 'User is logged in', loggedIn: true });
        } else {
            return res.status(200).json({ message: 'User is not logged in', loggedIn: false });
        }
    } catch (error) {
        console.error('Error checking login status: ', error);
        res.status(500).json({ error: `Error checking login status: ${error.message}` });
    }
})

router.post('/signup', async (req,res)=>{
    const {email,username , password, favorites, unit} = req.body;

    const authparams = {
        ClientId : "6hffsn13pcleij2248u44ag5tg",
        Username: username,
        Password : password,
        UserAttributes:[
            {
                Name: 'email',
                Value: email
            },
            {
                Name: 'preferred_username', // Add preferred_username here
                Value: username, // Ensure this is provided in the request body
            },
        ]
    }

    try{
        const signUpResponse = await cognito.signUp(authparams).promise()

        const params={
            TableName : 'Users',
            Item : {
                username,
                email,
                favorites: [favorites] || ['Karachi'],
                unit: unit || 'Celcius',
                createdAt : Date.now(),
                verificationStatus: false

            }
        }
        await db.put(params).promise()

        const userParams = {
            TableName:'Users',
            Key : {username}
        }

        const userData = await db.get(userParams).promise()

        res.status(200).json({message: 'User signed up successfully',  user: userData.Item})
    }
    catch(error){
        console.error("Error Signing up: ", error)
        res.status(500).json({error:`Sign up error ${error}`})
    }
});

router.post('/verify', async (req, res)=>{
    const{username, verificationCode} = req.body;

    const verificationParams={
        ClientId : "6hffsn13pcleij2248u44ag5tg",
        Username: username,
        ConfirmationCode: verificationCode
    };
    try{
        await cognito.confirmSignUp(verificationParams).promise();

        const updateParams={
            TableName: 'Users',
            Key:{username},
            UpdateExpression:"SET verificationStatus = :verified",
            ExpressionAttributeValues:{
                ":verified": true
            }
        }
        await db.update(updateParams).promise()

        const userParams = {
            TableName:'Users',
            Key : {username}
        }

        const userData = await db.get(userParams).promise()

        res.status(200).json({message: "User verified sucessfully", user : userData.Item})
    } catch(error){
        console.error('Error verifying user: ', error)
        res.status(500).json({error:`${error.message}`})
    }
});

router.post('/resend-code', async (req, res) => {
    const { username } = req.body;

    const resendParams = {
        ClientId: "6hffsn13pcleij2248u44ag5tg", // Replace with your actual Client ID
        Username: username,
    };

    try {
        await cognito.resendConfirmationCode(resendParams).promise();
        res.status(200).json({ message: 'Verification code resent successfully' });
    } catch (error) {
        console.error('Error resending verification code: ', error);
        res.status(500).json({ error: `Error resending verification code: ${error.message}` });
    }
});

router.post('/signin', async (req, res)=>{
    const {username , password} = req.body;

    try{
        const userParams = {
            TableName:'Users',
            Key : {username}
        }

        const userData = await db.get(userParams).promise()

        if(!userData.Item){
            return res.status(403).json({error:'User not found'})
        }

        if(!userData.Item.verificationStatus){
            return res.status(403).json({error: 'User is not verified. Please verify your email address'})
        }

        const authParams = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: "6hffsn13pcleij2248u44ag5tg",
            AuthParameters: {
                USERNAME: username,
                PASSWORD : password
            }
        }

        const authResponse = await cognito.initiateAuth(authParams).promise();

        await setUserLoginStatus(username, 'loggedIn');

        res.status(200).json({message: 'Sign in successfull', user: userData.Item ,authResponse})

    } catch(error){
        console.log('Error singing in : ', error)
        res.status(500).json({error: `Sign in error : ${error}`})
    }
})


router.post('/google-signin', async (req, res) => {
    const { accessToken } = req.body;

    try {
        // Verify the access token with Google's tokeninfo endpoint
        const response = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
        const payload = response.data;

        if (!payload || !payload.sub) {
            return res.status(400).json({ error: 'Invalid access token' });
        }

        const username = payload['sub']; // Unique identifier for the user
        const email = payload['email'];

        // Check if the user exists in the database
        const userData = await db.get({
            TableName: 'Users',
            Key: { username },
        }).promise();

        // If the user does not exist, create a new entry
        if (!userData.Item) {
            const params = {
                TableName: 'Users',
                Item: {
                    username,
                    email,
                    favorites: ['Karachi'],
                    unit: 'Celsius',
                    createdAt: Date.now(),
                    verificationStatus: true,
                },
            };

            await db.put(params).promise();
        }

        const userData_final = await db.get({
            TableName: 'Users',
            Key: { username },
        }).promise();

        await setUserLoginStatus(username, 'loggedIn');

        
        res.status(200).json({ message: 'Google Sign-in successful', user: userData_final.Item });
    } catch (error) {
        console.error('Error during Google Sign-in:', error);
        res.status(500).json({ error: `Google Sign-in error: ${error.message}` });
    }
});

module.exports =router;