const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const DIRECTORY = __dirname;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.geojson': 'application/json',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Default to index.html for root path
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Get file path
  const filePath = path.join(DIRECTORY, pathname);
  
  // Get file extension
  const ext = path.extname(filePath).toLowerCase();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>404 - File Not Found</title></head>
            <body>
              <h1>404 - File Not Found</h1>
              <p>The file <code>${pathname}</code> was not found.</p>
              <p><a href="/">Go back to home</a></p>
            </body>
          </html>
        `);
      } else {
        // Server error
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>500 - Server Error</title></head>
            <body>
              <h1>500 - Server Error</h1>
              <p>An error occurred: ${err.message}</p>
              <p><a href="/">Go back to home</a></p>
            </body>
          </html>
        `);
      }
      return;
    }
    
    // Set content type
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Send file
    res.writeHead(200);
    res.end(data);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('🚀 Node.js server started!');
  console.log(`📁 Serving files from: ${DIRECTORY}`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
  
  // Try to open browser (Windows)
  const { exec } = require('child_process');
  exec(`start http://localhost:${PORT}`, (err) => {
    if (err) {
      console.log('Could not open browser automatically. Please open manually.');
    }
  });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server stopped by user');
  server.close(() => {
    process.exit(0);
  });
});
