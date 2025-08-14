const express = require('express');
const app = express();

// A simple test route for our summarizer
app.post('/summarize', (req, res) => {
  // This message will appear in the Vercel logs if the route is hit
  console.log("SUCCESS: The /summarize test endpoint was reached!");

  // Send a success response back to the frontend
  res.status(200).json({ summary: "If you can see this message, the test was successful!" });
});

// A catch-all to see if other paths are being requested
app.all('*', (req, res) => {
  console.log(`INFO: A request was made to an unknown path: ${req.method} ${req.path}`);
  res.status(404).json({ error: `Route not found` });
});

// Export the app for Vercel
module.exports = app;
