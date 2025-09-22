import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors()); // Allows access from browsers

// --- Get your secret keys from Render's Environment Variables ---
const REAL_API_URL = process.env.REAL_API_URL;
const REAL_API_KEY = process.env.REAL_API_KEY;
const TRIAL_API_KEY = process.env.TRIAL_API_KEY;

// --- Define the main route for your proxy API ---
app.get('/info', async (req, res) => {
    // 1. Get the parameters from the user's request
    const userKey = req.query.key;
    const type = req.query.type;
    const term = req.query.term;

    // 2. Check if the user's trial key is correct
    if (!userKey || userKey !== TRIAL_API_KEY) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid or missing API key.',
            api_owner: '@TrustedXDeal'
        });
    }

    // 3. Make sure 'type' and 'term' were provided
    if (!type || !term) {
        return res.status(400).json({
            status: 'error',
            message: 'Missing required parameters: type and term.',
            api_owner: '@TrustedXDeal'
        });
    }

    try {
        // 4. Build the URL for the REAL API
        // It uses the 'type' and 'term' from the user, but YOUR secret key
        const realApiParams = new URLSearchParams({
            key: REAL_API_KEY,
            type: type,
            term: term
        });
        const finalUrl = `${REAL_API_URL}?${realApiParams.toString()}`;

        // 5. Call the real API
        const apiResponse = await fetch(finalUrl);
        const responseData = await apiResponse.json();

        // 6. Add your owner tag to the response
        const modifiedResponse = {
            ...responseData, // This copies the whole response from the real API
            api_owner: '@TrustedXDeal' // This adds your tag
        };

        // 7. Send the complete, modified response back to the user
        res.status(apiResponse.status).json(modifiedResponse);

    } catch (error) {
        // This will catch any network errors
        res.status(500).json({
            status: 'error',
            message: 'Proxy server failed to fetch data.',
            api_owner: '@TrustedXDeal'
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});
