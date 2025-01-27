import http.server
import socketserver

PORT = 8080

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
})

httpd = socketserver.TCPServer(("", PORT), Handler)
print(f"Serving at http://localhost:{PORT}")
httpd.serve_forever()
