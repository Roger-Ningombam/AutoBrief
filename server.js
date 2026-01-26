import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Import API Handlers
import ingestHandler from './api/ingest.js';
import generateHandler from './api/generate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Helper to polyfill Vercel/Express-like response methods
const wrapResponse = (res) => {
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
    };
    return res;
};

// Helper to parse body
const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        if (req.method !== 'POST') return resolve({});
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
};

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Wrap response
    wrapResponse(res);

    // API Routes
    if (req.url.startsWith('/api/')) {
        try {
            req.body = await parseBody(req);

            if (req.url === '/api/ingest') {
                return await ingestHandler(req, res);
            }
            else if (req.url === '/api/generate') {
                return await generateHandler(req, res);
            }
            else {
                return res.status(404).json({ error: 'Not Found' });
            }
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // Static Files
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.status(404).end('404 Not Found');
            } else {
                res.status(500).end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.setHeader('Content-Type', contentType);
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Serving static files + API routes');
});
