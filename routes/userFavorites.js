const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const axios = require('axios');
AWS.config.update({ region: 'ap-south-1' });
const db = new AWS.DynamoDB.DocumentClient();


router.post('/addfav', async (req, res) => {
    const { newfav, username } = req.body;


    try {

        const getParams = {
            TableName: 'Users',
            Key: { username }
        };

        const user = await db.get(getParams).promise();

        if (!user.Item) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Step 3: Update the favorites list
        const currentFavorites = user.Item.favorites || [];

        if (!currentFavorites.includes(newfav)) {
            currentFavorites.push(newfav); // Add the new favorite
        }
        else {
            return res.status(504).json({ error: 'City already exits' });
        }

        const updateParams = {
            TableName: 'Users',
            Key: { username },
            UpdateExpression: 'SET favorites = :newFav',
            ExpressionAttributeValues: {
                ':newFav': currentFavorites
            },
            ReturnValues: 'UPDATED_NEW'

        };
        await db.update(updateParams).promise();

        const newuser = await db.get(getParams).promise();

        res.status(200).json(newuser.Item);
    } catch (error) {
        console.error('Error updating favorites:', error);
        res.status(500).json({ error: ` Failed to update favorites : ${error}` });
    }
})

router.post('/removefav', async (req, res) => {
    const { username, fav } = req.body;

    try {
        const getParam = {
            TableName: 'Users',
            Key: { username }

        }

        const user = await db.get(getParam).promise()

        if (!user.Item) {
            return res.status(404).json({ error: "User not found" })
        }

        const currentFavorites = (user.Item.favorites || []).map(fav=> fav.toUpperCase().trim());

        console.log(currentFavorites)
        const index = currentFavorites.indexOf(fav);

        if (index !== -1) {

            currentFavorites.splice(index, 1)
        }
        else {
            console.log(fav)
            return res.status(404).json({ error: "City not found" })
        }

        const updateParams = {
            TableName: 'Users',
            Key: { username },
            UpdateExpression: 'SET favorites = :newFav',
            ExpressionAttributeValues: {
                ':newFav': currentFavorites
            },

            ReturnValues: 'UPDATED_NEW'

        }

        await db.update(updateParams).promise()

        const newuser = await db.get(getParam).promise()

        return res.status(200).json(newuser.Item)
    } catch (error) {
        console.error('Error updating favorites:', error);
        res.status(500).json({ error: `Failed to update favorites: ${error}` });
    }


})

module.exports = router;