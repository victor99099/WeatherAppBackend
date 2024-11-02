const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk')

const axios = require('axios');
AWS.config.update({ region: 'ap-south-1' });

const apiKey = '0571fc40afe0f77bb8737158022c23e5';
const apiKeyForecast = "31be16144b084334a7b6cd087d3bf50c";
const apiKeyForecast2 = "2aba49f182c742bd9cc07a9ee694e82d";

async function getCoordinates(city) {

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    const response = await axios.get(url);

    const { coord } = response.data;
    return coord;

}

router.get('/today', async (req, res) => {
    try {
        const city = req.query.city;

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

        const response = await axios.get(url);

        res.status(200).json({
            city: response.data.name,
            temperature: response.data.main.temp,
            feels_like: response.data.main.feels_like,
            description: response.data.weather[0].description,
            humidity: response.data.main.humidity,
            wind_speed: response.data.wind.speed,
            pressure: response.data.main.pressure,
            sunrise: new Date(response.data.sys.sunrise * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            sunset: new Date(response.data.sys.sunset * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
        })
    }
    catch (error) {
        res.status(500).json({ error: `Failed to retrieve current weather ${error}.` });
    }
});

router.get('/forecast', async (req, res) => {
    try {
        const city = req.query.city;
        const coordinates = await getCoordinates(city);
        console.log(coordinates.lat, coordinates.lon);

        const weatherbitUrl = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${coordinates.lat}&lon=${coordinates.lon}&key=${apiKeyForecast2}&days=7`;
        const weatherbitResponse = await axios.get(weatherbitUrl);
        const dailyForecast = weatherbitResponse.data.data;

        // Helper function to get sunrise and sunset times for a specific day
        const getSunriseSunset = async (lat, lon, date) => {
            const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${date}&formatted=0`;
            const response = await axios.get(url);
            const { sunrise, sunset } = response.data.results;

            // Convert to Date objects
            const sunriseDate = new Date(sunrise);
            const sunsetDate = new Date(sunset);

            // Format to HH:MM AM/PM
            const formattedSunrise = sunriseDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const formattedSunset = sunsetDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            return { sunrise: formattedSunrise, sunset: formattedSunset };
        };

        // Map each day in the forecast, adding sunrise and sunset times
        const forecast = await Promise.all(dailyForecast.slice(0, 7).map(async (day) => {
            const { sunrise, sunset } = await getSunriseSunset(coordinates.lat, coordinates.lon, day.valid_date);
            return {
                city: city,
                temperature: day.max_temp,
                feels_like: day.app_max_temp,
                description: day.weather.description,
                humidity: day.rh,
                wind_speed: day.wind_spd,
                pressure: day.pres,
                sunrise,
                sunset
            };
        }));

        res.status(200).json(forecast);

    } catch (error) {
        res.status(500).json({ error: `Failed to retrieve weather forecast: ${error.message}` });
    }
});

module.exports = router;