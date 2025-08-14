const express = require('express');
const app = express();

// A single, simple test route
app.get('/api/test', (req, res) => {
  res.status(200).send('It works! The test route is successful.');
});

module.exports = app;
