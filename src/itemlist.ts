import { join } from 'path';
import { existsSync } from 'fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

export interface MarketItem {
    mc_id: string;
    name_th: string;
    base_price: number;
    buy_price: number;
    sell_price: number;
    spread_ratio: number;
    buy_stopped: boolean;
}

interface ApiResponse {
    items: MarketItem[];
}

let cachedItems: MarketItem[] = [];
let cacheTime = 0;

export async function fetchItemsCached(): Promise<MarketItem[]> {
    const now = Date.now();
    if (cachedItems.length > 0 && now - cacheTime < 60000) {
        return cachedItems;
    }
    
    const apiUrl = process.env.ROGERLAND_API;
    if (!apiUrl) return [];
    
    try {
        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = (await response.json()) as ApiResponse;
            if (data.items && Array.isArray(data.items)) {
                cachedItems = data.items;
                cacheTime = now;
                return cachedItems;
            }
        }
    } catch (e) {
        console.error('Failed to fetch market items:', e);
    }
    return cachedItems;
}

const fontFamily = 'Tahoma, "Leelawadee UI", "Microsoft Sans Serif", sans-serif';

export function getItemImagePath(mcId: string): string | null {
    const [namespace, name] = mcId.includes(':') ? mcId.split(':') : ['minecraft', mcId];
    if (!name) return null;

    const folder = namespace === 'tastyvanilla' ? 'item_mod' : 'item';
    const filePath = join(process.cwd(), 'src', 'asset', folder, `${name}.png`);
    return existsSync(filePath) ? filePath : null;
}

function drawRoundedRect(ctx: any, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

export async function generateGridImage(items: MarketItem[], title?: string): Promise<Buffer> {
    const cardWidth = 270;
    const cardHeight = 120;
    const gapX = 20;
    const gapY = 20;
    const paddingLeft = 30;
    const paddingBottom = 30;
    
    const columns = Math.min(items.length, 3);
    const rows = Math.ceil(items.length / columns);
    const gridStartY = title ? 100 : 30;
    
    const width = paddingLeft * 2 + columns * cardWidth + (columns - 1) * gapX;
    const height = gridStartY + rows * cardHeight + (rows - 1) * gapY + paddingBottom;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, width, height);
    
    if (title) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 24px ${fontFamily}`;
        ctx.fillText(title, 30, 45);
        
        ctx.fillStyle = '#949ba4';
        ctx.font = `14px ${fontFamily}`;
        ctx.fillText('Live market prices & status', 30, 70);
        
        ctx.strokeStyle = '#3f4147';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, 85);
        ctx.lineTo(width - 30, 85);
        ctx.stroke();
    }
    
    const imagePromises = items.map(async (item) => {
        const path = getItemImagePath(item.mc_id);
        if (path) {
            try {
                const img = await loadImage(path);
                return { mcId: item.mc_id, img };
            } catch {
            }
        }
        return { mcId: item.mc_id, img: null };
    });
    
    const loaded = await Promise.all(imagePromises);
    const imageMap = new Map(loaded.map(x => [x.mcId, x.img]));
    
    for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]!;
        const col = idx % columns;
        const row = Math.floor(idx / columns);
        
        const cardX = paddingLeft + col * (cardWidth + gapX);
        const cardY = gridStartY + row * (cardHeight + gapY);
        
        ctx.fillStyle = '#313338';
        drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 8);
        

        ctx.fillStyle = item.buy_stopped ? '#f23f43' : '#23a55a';
        ctx.beginPath();
        ctx.arc(cardX + 22, cardY + 22, 6, 0, Math.PI * 2);
        ctx.fill();
        
        const img = imageMap.get(item.mc_id);
        if (img) {
            ctx.drawImage(img, cardX + 38, cardY + 10, 24, 24);
        }
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 16px ${fontFamily}`;
        ctx.fillText(item.name_th, cardX + 70, cardY + 28);
        
        const cleanName = item.mc_id.split(':').pop() || item.mc_id;
        ctx.fillStyle = '#949ba4';
        ctx.font = `13px ${fontFamily}`;
        ctx.fillText(`Item Id: ${cleanName}`, cardX + 12, cardY + 62);
        
        ctx.fillStyle = '#dbdee1';
        ctx.font = `14px ${fontFamily}`;
        ctx.fillText(`Buy: ${item.buy_price} | Sell: ${item.sell_price}`, cardX + 12, cardY + 84);
        ctx.fillText(`Base: ${item.base_price} | Spread: ${item.spread_ratio}`, cardX + 12, cardY + 106);
    }
    
    return canvas.toBuffer('image/png');
}
