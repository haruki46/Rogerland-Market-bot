import { join } from 'path';
import { getItemImagePath } from '../itemlist.ts';

const HTML_FILE_PATH = join(process.cwd(), 'src', 'web', 'index.html');
const CSS_FILE_PATH = join(process.cwd(), 'src', 'web', 'style.css');
const SCRIPT_FILE_PATH = join(process.cwd(), 'src', 'web', 'script.js');

let port = 3000;
let server;

while (port < 3100) {
    try {
        server = Bun.serve({
            port: port,
            async fetch(req) {
                const url = new URL(req.url);

                if (url.pathname === '/') {
                    const htmlContent = await Bun.file(HTML_FILE_PATH).text();
                    return new Response(htmlContent, {
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                }

                if (url.pathname === '/style.css') {
                    const cssContent = await Bun.file(CSS_FILE_PATH).text();
                    return new Response(cssContent, {
                        headers: { 'Content-Type': 'text/css; charset=utf-8' }
                    });
                }

                if (url.pathname === '/script.js') {
                    const jsContent = await Bun.file(SCRIPT_FILE_PATH).text();
                    return new Response(jsContent, {
                        headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
                    });
                }

                if (url.pathname === '/api/market-prices') {
                    const apiUrl = process.env.ROGERLAND_API || 'https://rglshop.rogerfilms.com/shop/api/market-prices';
                    try {
                        const response = await fetch(apiUrl);
                        if (!response.ok) {
                            return new Response(JSON.stringify({ error: 'Failed to fetch from Rogerland API' }), {
                                status: 500,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                        const data = await response.json();
                        return new Response(JSON.stringify(data), {
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            }
                        });
                    } catch (err) {
                        return new Response(JSON.stringify({ error: (err as Error).message }), {
                            status: 500,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }

                if (url.pathname === '/api/item-image') {
                    const mcId = url.searchParams.get('mc_id');
                    if (!mcId) {
                        return new Response('Missing mc_id', { status: 400 });
                    }
                    const imgPath = getItemImagePath(mcId);
                    if (imgPath) {
                        return new Response(Bun.file(imgPath));
                    }
                    return new Response('Not Found', { status: 404 });
                }

                return new Response('Not Found', { status: 404 });
            }
        });
        console.log(`Starting web server on http://localhost:${port}...`);
        break;
    } catch (err: any) {
        port++;
    }
}