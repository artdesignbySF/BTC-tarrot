const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

// Placeholder route for LNURL Pay
app.get('/api/lnurl', (req, res) => {
  res.send('LNURL Pay endpoint');
});

// Placeholder route for jackpot claims
app.post('/api/jackpot', (req, res) => {
  res.send('Jackpot claim endpoint');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
