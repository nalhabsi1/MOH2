#!/usr/bin/env python3
"""
Simple HTTP server to serve the health data visualization locally.
This avoids CORS issues when opening the HTML file directly in a browser.
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Configuration
PORT = 8000
DIRECTORY = Path(__file__).parent

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

def main():
    # Change to the project directory
    os.chdir(DIRECTORY)
    
    # Create server
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print(f"🚀 Server started at http://localhost:{PORT}")
        print(f"📁 Serving files from: {DIRECTORY}")
        print(f"🌐 Open your browser to: http://localhost:{PORT}/index.html")
        print("Press Ctrl+C to stop the server")
        
        # Try to open the browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}/index.html')
        except:
            pass
        
        # Start serving
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
        finally:
            httpd.shutdown()

if __name__ == "__main__":
    main()
