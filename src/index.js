const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Example route directly in index.js
app.get('/api/example', (req, res) => {
  res.json({ message: 'Hello from Node.js template!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
