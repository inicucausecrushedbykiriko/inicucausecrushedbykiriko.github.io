"""
 * Copyright (c) 2025 SingChun LEE @ Bucknell University. CC BY-NC 4.0.
 *
 * This code is provided mainly for educational purposes at Bucknell University.
 *
 * Licensed under Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0).
 * https://creativecommons.org/licenses/by-nc/4.0/
"""

import http.server
import socketserver
import socket

# Default starting port
PORT = 8080

# HTTP handler configuration
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
})

# Function to check if a port is already in use
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("", port))
            return False
        except socket.error:
            return True

# Increment the port if the default port is in use
while is_port_in_use(PORT):
    PORT += 1

# Start the server
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
