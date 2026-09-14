const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/autocomp', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  try {
    const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
