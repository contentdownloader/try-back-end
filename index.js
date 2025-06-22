import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { downloadInstagramContent } from './services/instagram.js';
import { downloadFacebookContent } from './services/facebook.js';
import { downloadTestContent } from './services/testContent.js';

dotenv.config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Create downloads directory if it doesn't exist
const downloadsDir = path.resolve(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Serve static files
app.use('/downloads', express.static(downloadsDir));

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Social Media Downloader API is running.' });
});

// ✅ Download endpoint
app.post('/api/download', async (req, res) => {
  try {
    const { url, platform, contentType } = req.body;

    if (!url || !platform || !contentType) {
      return res.status(400).json({
        error: 'Missing required fields: url, platform, contentType',
      });
    }

    let result;

    if (url.includes('test-content') || url.includes('demo')) {
      result = await downloadTestContent(url, contentType, downloadsDir);
    } else if (platform === 'instagram') {
      result = await downloadInstagramContent(url, contentType, downloadsDir);
    } else if (platform === 'facebook') {
      result = await downloadFacebookContent(url, contentType, downloadsDir);
    } else {
      return res.status(400).json({
        error: 'Unsupported platform. Use "instagram" or "facebook".',
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Failed to process download request',
      message: error.message,
    });
  }
});

// ✅ Simulated download progress
app.get('/api/download/:id/progress', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    progress: Math.floor(Math.random() * 100),
    status: 'downloading',
    note: 'Simulated progress. No real tracking implemented.',
  });
});

// ✅ List downloaded files
app.get('/api/downloads', (req, res) => {
  try {
    const files = fs.readdirSync(downloadsDir).map(filename => {
      const filePath = path.join(downloadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        downloadUrl: `${req.protocol}://${req.get('host')}/downloads/${filename}`,
      };
    });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list downloads' });
  }
});

// ✅ Delete a file
app.delete('/api/downloads/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(downloadsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ✅ Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at: http://localhost:${PORT}`);
  console.log(`📁 Downloads folder: ${downloadsDir}`);
  console.log('🚀 API is live and ready to handle requests.');
});
