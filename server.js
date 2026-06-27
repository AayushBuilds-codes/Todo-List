const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WORKSPACE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Decode URI to handle spaces/special characters in filenames
    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(req.url);
    } catch (e) {
        decodedUrl = req.url;
    }

    // Clean query parameters/hashes from URL
    const urlPath = decodedUrl.split('?')[0].split('#')[0];
    
    // Redirect root '/' to '/Portfolio/index.html' so relative assets load correctly
    if (urlPath === '/' || urlPath === '') {
        res.writeHead(302, { 'Location': '/Portfolio/index.html' });
        res.end();
        return;
    }
    
    let filePath = path.join(WORKSPACE_DIR, urlPath);
    
    // Safety check: ensure the target file is inside the workspace directory
    const resolvedWorkspace = path.resolve(WORKSPACE_DIR).toLowerCase();
    const resolvedFile = path.resolve(filePath).toLowerCase();
    const isInside = resolvedFile === resolvedWorkspace || resolvedFile.startsWith(resolvedWorkspace + path.sep);
    if (!isInside) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden: Access Denied');
        return;
    }

    // Check if the file exists
    fs.stat(filePath, (err, stats) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        // If it is a directory, redirect to its index.html
        if (stats.isDirectory()) {
            if (!decodedUrl.endsWith('/')) {
                res.writeHead(302, { 'Location': encodeURI(decodedUrl + '/') });
                res.end();
                return;
            }
            const indexPath = path.join(filePath, 'index.html');
            fs.stat(indexPath, (indexErr, indexStats) => {
                if (!indexErr && indexStats.isFile()) {
                    res.writeHead(302, { 'Location': encodeURI(decodedUrl + 'index.html') });
                    res.end();
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found (Directory Listing Disabled)');
                }
            });
            return;
        }

        // Read and serve the file
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.on('error', (streamErr) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
        });
        stream.pipe(res);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server is running at http://127.0.0.1:${PORT}/`);
    console.log(`Serving workspace: ${WORKSPACE_DIR}`);
});
