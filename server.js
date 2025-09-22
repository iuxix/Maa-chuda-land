import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors()); // Allows access from browsers

// --- Get your secret keys from Render's Environment Variables ---
const REAL_API_URL  = process.env.REAL_API_URL;   // e.g. http://osintx.info/API/krobetahack.php
const REAL_API_KEY  = process.env.REAL_API_KEY;   // e.g. P6NW6D1
const TRIAL_API_KEY = process.env.TRIAL_API_KEY;  // e.g. deba_beast
const ADMIN_KEY     = process.env.ADMIN_KEY;      // e.g. Deb_admin

// --- In-memory counters (reset on deploy/restart) ---
let totalRequests   = 0;  // all /info requests
let successRequests = 0;  // upstream 2xx
let failRequests    = 0;  // upstream non-2xx or exceptions
const startedAt     = new Date().toISOString();

// --- Trial proxy route ---
// Usage: /info?key=deba_beast&type=mobile&term=9864382819
app.get('/info', async (req, res) => {
  const userKey = req.query.key;
  const type    = req.query.type;
  const term    = req.query.term;

  // Validate trial key
  if (!userKey || userKey !== TRIAL_API_KEY) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or missing API key.',
      api_owner: '@TrustedXDeal'
    });
  }

  // Validate params
  if (!type || !term) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: type and term.',
      api_owner: '@TrustedXDeal'
    });
  }

  totalRequests += 1;

  try {
    // Build real API URL with your SECRET key
    const params = new URLSearchParams({
      key: REAL_API_KEY,
      type: String(type),
      term: String(term)
    });

    const finalUrl = `${REAL_API_URL}?${params.toString()}`;

    // Call real API
    const apiResponse = await fetch(finalUrl);

    // Try parse as JSON, otherwise forward raw text
    let responsePayload;
    try {
      responsePayload = await apiResponse.json();
    } catch {
      const raw = await apiResponse.text();
      responsePayload = { raw };
    }

    if (apiResponse.ok) successRequests += 1;
    else failRequests += 1;

    // Inject owner tag
    const modified = {
      ...responsePayload,
      api_owner: '@TrustedXDeal'
    };

    return res.status(apiResponse.status).json(modified);

  } catch (error) {
    failRequests += 1;
    return res.status(500).json({
      status: 'error',
      message: 'Proxy server failed to fetch data.',
      api_owner: '@TrustedXDeal'
    });
  }
});

// --- Admin stats route ---
// Usage: /admin?key=Deb_admin&term=adminview
app.get('/admin', (req, res) => {
  const key  = req.query.key;
  const term = req.query.term;

  if (key !== ADMIN_KEY || term !== 'adminview') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized',
      api_owner: '@TrustedXDeal'
    });
  }

  const uptimeMs = Date.now() - new Date(startedAt).getTime();

  return res.json({
    status: 'ok',
    service: 'deba-trial-api',
    startedAt,
    uptime_ms: uptimeMs,
    totals: {
      requests: totalRequests,
      success: successRequests,
      failed: failRequests
    },
    api_owner: '@TrustedXDeal'
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});
