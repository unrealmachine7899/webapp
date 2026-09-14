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

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL parameter required');

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const contentType = response.headers.get('content-type') || '';

    // Strip frame-blocking security headers
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['x-frame-options', 'content-security-policy', 'content-encoding'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Injects link and form handler to force iframe traffic through /proxy
      const injector = `
        <base href="${targetUrl}">
        <script>
          document.addEventListener('click', function(e) {
            const a = e.target.closest('a');
            if (a && a.href) {
              e.preventDefault();
              window.location.href = '/proxy?url=' + encodeURIComponent(a.href);
            }
          }, true);

          document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.action) {
              e.preventDefault();
              const formData = new FormData(form);
              const params = new URLSearchParams(formData).toString();
              const method = (form.method || 'GET').toUpperCase();
              if (method === 'GET') {
                const target = form.action + (form.action.includes('?') ? '&' : '?') + params;
                window.location.href = '/proxy?url=' + encodeURIComponent(target);
              }
            }
          }, true);
        </script>
      `;

      html = html.includes('<head>') ? html.replace('<head>', `<head>${injector}`) : injector + html;
      res.send(html);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    res.status(500).send('Proxy Error: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
