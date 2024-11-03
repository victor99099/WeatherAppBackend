// server.js

const express = require('express'); // Import Express
const AWS = require('aws-sdk'); // Import AWS SDK for DynamoDB
const path = require('path'); // Import Path module
const app = express(); // Create an Express application
const cors = require('cors')
const port = 3000; // Set the port number
const redisClient = require('./redisClient');
// Middleware to parse JSON request bodies
app.use(express.json()); // Add this line to parse JSON requests
app.use(cors())

app.use('/public', express.static(path.join(__dirname, 'public'))); // Serve static files from public directory

const avatarRoute = require('./routes/avatarRoute'); // Import avatar routes
const signRoute = require('./routes/signRoute'); // Import sign routes
const weatherRoute = require('./routes/weatherRoute'); // Import sign routes
const favRoute = require('./routes/userFavorites'); // Import sign routes

app.use('/avatar', avatarRoute); // Mount avatar routes
app.use('/auth', signRoute); // Mount sign routes
app.use('/weather', weatherRoute); // Mount sign routes
app.use('/fav', favRoute); // Mount sign routes

app.get('/', (req, res) => {
    res.send('Hello World!'); // Base route
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`); // Log the running server
});
