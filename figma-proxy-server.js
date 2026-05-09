const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3456;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files (for the token helper)
app.use(express.static(__dirname));

/**
 * POST /api/figma/validate
 * Validate Figma API token
 */
app.post('/api/figma/validate', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const response = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'X-Figma-Token': token,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Invalid token: ${response.statusText}` 
      });
    }

    const data = await response.json();
    res.json({ success: true, user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/figma/frame-image
 * Fetch a specific frame's image URL from Figma
 */
app.post('/api/figma/frame-image', async (req, res) => {
  const { figmaUrl, nodeId, token } = req.body;
  
  if (!figmaUrl || !nodeId || !token) {
    return res.status(400).json({ error: 'figmaUrl, nodeId, and token are required' });
  }

  try {
    // Extract file ID from Figma URL
    const fileIdMatch = figmaUrl.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
    if (!fileIdMatch) {
      return res.status(400).json({ error: 'Invalid Figma URL' });
    }
    const fileId = fileIdMatch[1];

    // Format node-id (Figma API expects "123:456" format)
    const apiNodeId = nodeId.replace('-', ':');

    // Call Figma API
    const apiUrl = `https://api.figma.com/v1/images/${fileId}?ids=${apiNodeId}&format=png&scale=2`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'X-Figma-Token': token,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();

    if (!data.images || !data.images[apiNodeId]) {
      return res.status(404).json({ error: 'Frame image not found' });
    }

    res.json({ 
      success: true, 
      imageUrl: data.images[apiNodeId] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/figma/proxy-image
 * Proxy an image URL to avoid CORS issues
 */
app.get('/api/figma/proxy-image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Figma Proxy Server running at http://localhost:${PORT}`);
  console.log(`   - Validate token: POST http://localhost:${PORT}/api/figma/validate`);
  console.log(`   - Fetch frame: POST http://localhost:${PORT}/api/figma/frame-image`);
  console.log(`   - Proxy image: GET http://localhost:${PORT}/api/figma/proxy-image?url=...`);
});
