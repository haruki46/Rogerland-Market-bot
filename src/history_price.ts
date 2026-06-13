import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getItemImagePath } from './itemlist.ts';
import type { MarketItem } from './itemlist.ts';

export interface HistoryEntry {
    ts: string;
    buy_price: number;
    sell_price: number;
}

export interface DetailedMarketItem extends MarketItem {
    history?: HistoryEntry[];
    volume_bought_24h?: number;
    volume_sold_24h?: number;
    pct_change_24h?: number;
}

const fontFamily = 'Tahoma, "Leelawadee UI", "Microsoft Sans Serif", sans-serif';

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

export async function generateHistoryGraphImage(item: DetailedMarketItem, rawHistory: HistoryEntry[]): Promise<Buffer> {
    const width = 1000;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#2b2d31';
    drawRoundedRect(ctx, 30, 25, 74, 74, 12);

    const imagePath = getItemImagePath(item.mc_id);
    if (imagePath) {
        try {
            const img = await loadImage(imagePath);
            ctx.drawImage(img, 41, 36, 52, 52);
        } catch {}
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px ${fontFamily}`;
    ctx.fillText(item.name_th, 120, 56);

    const cleanId = item.mc_id.replace(/^[^:]+:/, '');
    ctx.fillStyle = '#949ba4';
    ctx.font = `15px ${fontFamily}`;
    ctx.fillText(`# ${cleanId}`, 120, 82);

    ctx.fillStyle = '#2b2d31';
    drawRoundedRect(ctx, 480, 25, 230, 74, 8);

    ctx.fillStyle = '#949ba4';
    ctx.font = `13px ${fontFamily}`;
    ctx.fillText('Buy Price', 495, 47);

    ctx.fillStyle = '#23a55a';
    ctx.beginPath();
    ctx.arc(690, 43, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 22px ${fontFamily}`;
    ctx.fillText(item.buy_price.toLocaleString(), 495, 80);

    ctx.fillStyle = '#2b2d31';
    drawRoundedRect(ctx, 740, 25, 230, 74, 8);

    ctx.fillStyle = '#949ba4';
    ctx.font = `13px ${fontFamily}`;
    ctx.fillText('Sell Price', 755, 47);

    ctx.fillStyle = '#949ba4';
    ctx.beginPath();
    ctx.arc(950, 43, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 22px ${fontFamily}`;
    ctx.fillText(item.sell_price.toLocaleString(), 755, 80);

    const graphLeft = 80;
    const graphRight = 920;
    const graphWidth = graphRight - graphLeft;
    const graphTop = 150;
    const graphBottom = 510;
    const graphHeight = graphBottom - graphTop;

    const history = (rawHistory && rawHistory.length > 0) ? rawHistory : [
        { ts: new Date().toISOString(), buy_price: item.buy_price, sell_price: item.sell_price }
    ];

    const sellPrices = history.map(h => h.sell_price);
    const buyPrices = history.map(h => h.buy_price);

    let maxSell = Math.max(...sellPrices);
    let minSell = Math.min(...sellPrices);
    if (maxSell === minSell) {
        maxSell += 5;
        minSell = Math.max(0, minSell - 5);
    }
    const sellRange = maxSell - minSell;
    const sellMinPad = Math.max(0, minSell - sellRange * 0.15);
    const sellMaxPad = maxSell + sellRange * 0.15;

    let maxBuy = Math.max(...buyPrices);
    let minBuy = Math.min(...buyPrices);
    if (maxBuy === minBuy) {
        maxBuy += 5;
        minBuy = Math.max(0, minBuy - 5);
    }
    const buyRange = maxBuy - minBuy;
    const buyMinPad = Math.max(0, minBuy - buyRange * 0.15);
    const buyMaxPad = maxBuy + buyRange * 0.15;

    ctx.strokeStyle = '#2f3136';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = graphTop + (i * graphHeight) / 4;
        ctx.beginPath();
        ctx.moveTo(graphLeft, y);
        ctx.lineTo(graphRight, y);
        ctx.stroke();

        const sellVal = sellMaxPad - (i * (sellMaxPad - sellMinPad)) / 4;
        ctx.fillStyle = '#949ba4';
        ctx.font = `12px ${fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(sellVal).toLocaleString(), graphLeft - 15, y + 4);

        const buyVal = buyMaxPad - (i * (buyMaxPad - buyMinPad)) / 4;
        ctx.textAlign = 'left';
        ctx.fillText(Math.round(buyVal).toLocaleString(), graphRight + 15, y + 4);
    }

    const n = history.length;
    const points: { x: number; y: number }[] = [];
    const barWidth = Math.max(3, (graphWidth / n) * 0.45);

    for (let i = 0; i < n; i++) {
        const entry = history[i]!;
        const x = (n === 1) ? (graphLeft + graphWidth / 2) : (graphLeft + (i * graphWidth) / (n - 1));
        
        const buyVal = entry.buy_price;
        const buyY = graphBottom - ((buyVal - buyMinPad) / (buyMaxPad - buyMinPad)) * graphHeight;
        
        ctx.fillStyle = 'rgba(148, 155, 164, 0.22)';
        ctx.fillRect(x - barWidth / 2, buyY, barWidth, graphBottom - buyY);

        const sellVal = entry.sell_price;
        const sellY = graphBottom - ((sellVal - sellMinPad) / (sellMaxPad - sellMinPad)) * graphHeight;
        points.push({ x, y: sellY });
    }

    if (points.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, graphBottom);
        ctx.lineTo(points[0]!.x, points[0]!.y);
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i]!;
            const p1 = points[i + 1]!;
            const xc = (p0.x + p1.x) / 2;
            const yc = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
        ctx.lineTo(points[points.length - 1]!.x, graphBottom);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, graphTop, 0, graphBottom);
        grad.addColorStop(0, 'rgba(35, 165, 90, 0.35)');
        grad.addColorStop(1, 'rgba(35, 165, 90, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#23a55a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i]!;
            const p1 = points[i + 1]!;
            const xc = (p0.x + p1.x) / 2;
            const yc = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
        ctx.stroke();

        const lastPt = points[points.length - 1]!;
        ctx.fillStyle = '#23a55a';
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    const numLabels = Math.min(n, 6);
    ctx.fillStyle = '#949ba4';
    ctx.font = `12px ${fontFamily}`;
    ctx.textAlign = 'center';

    for (let i = 0; i < numLabels; i++) {
        const idx = Math.round((i * (n - 1)) / (numLabels - 1));
        const entry = history[idx];
        if (!entry) continue;

        const x = (n === 1) ? (graphLeft + graphWidth / 2) : (graphLeft + (idx * graphWidth) / (n - 1));
        const d = new Date(entry.ts);
        
        let label = '';
        const timeDiff = new Date(history[n - 1]!.ts).getTime() - new Date(history[0]!.ts).getTime();
        if (timeDiff > 2 * 24 * 60 * 60 * 1000) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            label = `${d.getDate()}. ${months[d.getMonth()]}`;
        } else {
            const hrs = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            label = `${hrs}:${mins}`;
        }

        ctx.fillText(label, x, graphBottom + 25);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#949ba4';
    ctx.font = `13px ${fontFamily}`;
    ctx.fillText('Market Lookback: Last 10h — Timezone: UTC', 30, 570);

    ctx.textAlign = 'right';
    ctx.fillText('Powered by Rogerland Market', width - 30, 570);

    return canvas.toBuffer('image/png');
}
