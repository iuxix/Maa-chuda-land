import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ENV secrets (Render Dashboard → Environment)
const REAL_API_BASE = process.env.REAL_API_BASE;   // e.g. https://real-api.example.com
const REAL_API_KEY  = process.env.REAL_API_KEY;    // if needed

// Utility: safe JSON parse
const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
};

// Example endpoint: pass-through with owner tag
app.get("/check", async (req, res) => {
  try {
    // Query params pass-through, e.g. plate=AS05N9378
    const qs = new URLSearchParams(req.query).toString();

    // Construct real API URL
    const url = `${REAL_API_BASE}/check?${qs}`;

    // Forward headers as required
    const realRes = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Authorization": REAL_API_KEY ? `Bearer ${REAL_API_KEY}` : undefined
      }
    });

    // Read body safely
    const body = await safeJson(realRes);

    // Inject owner block
    const wrapped = {
      ...(
        typeof body === "object" && body !== null
        ? body
        : { data: body }
      ),
      api_owner: "@TrustedXDeal"
    };

    // Mirror status code
    res.status(realRes.status).json(wrapped);
  } catch (err) {
    res.status(500).json({
      error: "proxy_error",
      message: err?.message || "Unknown error",
      api_owner: "@TrustedXDeal"
    });
  }
});

// Optional: POST variant
app.post("/check", async (req, res) => {
  try {
    const url = `${REAL_API_BASE}/check`;
    const realRes = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": REAL_API_KEY ? `Bearer ${REAL_API_KEY}` : undefined
      },
      body: JSON.stringify(req.body || {})
    });

    const body = await safeJson(realRes);
    const wrapped = {
      ...(typeof body === "object" && body !== null ? body : { data: body }),
      api_owner: "@TrustedXDeal"
    };

    res.status(realRes.status).json(wrapped);
  } catch (err) {
    res.status(500).json({ error: "proxy_error", message: err?.message || "Unknown error", api_owner: "@TrustedXDeal" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy running on ${PORT}`));
