"""
Quest 1 Python Server
Licensed under CC BY-NC 4.0 for educational purposes.
"""

import http.server
import socketserver
import socket

# Starting port
PORT = 3000

# HTTP request handler
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
})

# Function to check if a port is in use
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("", port))
            return False
        except socket.error:
            return True

# Increment port if in use
while is_port_in_use(PORT):
    PORT += 1

# Start the server
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving Quest 1 at http://localhost:{PORT}")
    httpd.serve_forever()
