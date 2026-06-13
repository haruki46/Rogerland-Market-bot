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

function getPriceAgo(history: HistoryEntry[], minutesAgo: number, isSell: boolean): number | null {
    if (!history || history.length === 0) return null;
    const latestTime = new Date(history[history.length - 1]!.ts).getTime();
    const targetTime = latestTime - minutesAgo * 60 * 1000;
    
    let closest = history[0]!;
    let minDiff = Math.abs(new Date(closest.ts).getTime() - targetTime);
    
    for (const entry of history) {
        const diff = Math.abs(new Date(entry.ts).getTime() - targetTime);
        if (diff < minDiff) {
            minDiff = diff;
            closest = entry;
        }
    }
    return isSell ? closest.sell_price : closest.buy_price;
}

export async function generateDashboardImage(item: DetailedMarketItem, rawHistory: HistoryEntry[]): Promise<Buffer> {
    const width = 1000;
    const height = 750;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0d0e10';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 22px ${fontFamily}`;
    ctx.fillText('Bazaar Information', 30, 45);

    ctx.fillStyle = '#1c1d21';
    ctx.beginPath();
    ctx.roundRect(width - 170, 25, 140, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#dbdee1';
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('Open Full Chart', width - 100, 44);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#1c1d21';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 70);
    ctx.lineTo(width - 30, 70);
    ctx.stroke();

    const history = (rawHistory && rawHistory.length > 0) ? rawHistory : [
        { ts: new Date().toISOString(), buy_price: item.buy_price, sell_price: item.sell_price }
    ];

    const currentBuy = item.buy_price;
    const currentSell = item.sell_price;
    
    const openBuy = history[0]!.buy_price;
    const openSell = history[0]!.sell_price;

    const highBuy = Math.max(...history.map(h => h.buy_price));
    const lowBuy = Math.min(...history.map(h => h.buy_price));

    const buyChange = currentBuy - openBuy;
    const buyPct = openBuy > 0 ? (buyChange / openBuy) * 100 : 0;
    const sellChange = currentSell - openSell;
    const sellPct = openSell > 0 ? (sellChange / openSell) * 100 : 0;

    const cleanName = item.mc_id.replace(/^[^:]+:/, '');

    ctx.fillStyle = '#8e9297';
    ctx.font = `12px ${fontFamily}`;
    ctx.fillText('+', 30, 95);
    ctx.fillText('1h', 55, 95);
    ctx.fillText('Indicators', 105, 95);

    ctx.fillStyle = '#55d0a1';
    ctx.font = `bold 13px ${fontFamily}`;
    ctx.fillText(`${cleanName} (BUY) - 1h - BAZAAR`, 30, 122);
    
    ctx.fillStyle = '#949ba4';
    ctx.font = `11px monospace`;
    const buyChangeText = `${buyChange >= 0 ? '+' : ''}${buyChange.toFixed(1)} (${buyChange >= 0 ? '+' : ''}${buyPct.toFixed(2)}%)`;
    ctx.fillText(`O ${openBuy.toLocaleString()}  H ${highBuy.toLocaleString()}  L ${lowBuy.toLocaleString()}  C ${currentBuy.toLocaleString()}`, 270, 122);
    
    ctx.fillStyle = buyChange >= 0 ? '#55d0a1' : '#ff4a5a';
    ctx.fillText(buyChangeText, width - 150, 122);

    ctx.fillStyle = '#ff4f9f';
    ctx.font = `bold 13px ${fontFamily}`;
    ctx.fillText(`${cleanName} (SELL) - BAZAAR`, 30, 142);
    
    ctx.fillStyle = '#949ba4';
    ctx.font = `11px monospace`;
    ctx.fillText(`C ${currentSell.toLocaleString()}`, 270, 142);
    
    ctx.fillStyle = sellChange >= 0 ? '#ff55b2' : '#ff4a5a';
    const sellChangeText = `${sellChange >= 0 ? '+' : ''}${sellChange.toFixed(1)} (${sellChange >= 0 ? '+' : ''}${sellPct.toFixed(2)}%)`;
    ctx.fillText(sellChangeText, width - 150, 142);

    const graphLeft = 50;
    const graphRight = 850;
    const graphWidth = graphRight - graphLeft;
    const graphTop = 165;
    const graphBottom = 480;
    const graphHeight = graphBottom - graphTop;

    const allPrices = [...history.map(h => h.buy_price), ...history.map(h => h.sell_price)];
    let maxPrice = Math.max(...allPrices);
    let minPrice = Math.min(...allPrices);
    if (maxPrice === minPrice) {
        maxPrice += 10;
        minPrice = Math.max(0, minPrice - 10);
    }
    const range = maxPrice - minPrice;
    const minPad = Math.max(0, minPrice - range * 0.08);
    const maxPad = maxPrice + range * 0.08;

    ctx.strokeStyle = '#1e1f22';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = graphTop + (i * graphHeight) / 5;
        ctx.beginPath();
        ctx.moveTo(graphLeft, y);
        ctx.lineTo(graphRight, y);
        ctx.stroke();

        const priceVal = maxPad - (i * (maxPad - minPad)) / 5;
        ctx.fillStyle = '#7a7e85';
        ctx.font = `11px monospace`;
        ctx.fillText(Math.round(priceVal).toLocaleString(), graphRight + 15, y + 4);
    }

    const n = history.length;
    const candleWidth = Math.max(4, (graphWidth / n) * 0.55);
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < n; i++) {
        const entry = history[i]!;
        const x = (n === 1) ? (graphLeft + graphWidth / 2) : (graphLeft + (i * graphWidth) / (n - 1));

        const openVal = i > 0 ? history[i - 1]!.buy_price : entry.buy_price;
        const closeVal = entry.buy_price;
        
        const highVal = Math.max(openVal, closeVal) + Math.abs(openVal - closeVal) * 0.25 + 0.2;
        const lowVal = Math.min(openVal, closeVal) - Math.abs(openVal - closeVal) * 0.25 - 0.2;

        const openY = graphBottom - ((openVal - minPad) / (maxPad - minPad)) * graphHeight;
        const closeY = graphBottom - ((closeVal - minPad) / (maxPad - minPad)) * graphHeight;
        const highY = graphBottom - ((highVal - minPad) / (maxPad - minPad)) * graphHeight;
        const lowY = graphBottom - ((lowVal - minPad) / (maxPad - minPad)) * graphHeight;

        const isGreen = closeVal >= openVal;
        const candleColor = isGreen ? '#09e099' : '#ff4a5a';

        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        ctx.fillStyle = candleColor;
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));
        const bodyY = Math.min(openY, closeY);
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);

        const sellVal = entry.sell_price;
        const sellY = graphBottom - ((sellVal - minPad) / (maxPad - minPad)) * graphHeight;
        points.push({ x, y: sellY });
    }

    if (points.length > 0) {
        ctx.strokeStyle = '#ff4f9f';
        ctx.lineWidth = 2.5;
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
    }

    if (n > 0) {
        const latestEntry = history[n - 1]!;
        
        const buyY = graphBottom - ((latestEntry.buy_price - minPad) / (maxPad - minPad)) * graphHeight;
        ctx.fillStyle = '#066347';
        ctx.fillRect(graphRight + 5, buyY - 9, 140, 18);
        ctx.fillStyle = '#09e099';
        ctx.font = `bold 11px monospace`;
        ctx.fillText(latestEntry.buy_price.toLocaleString(), graphRight + 12, buyY + 4);

        const sellY = graphBottom - ((latestEntry.sell_price - minPad) / (maxPad - minPad)) * graphHeight;
        ctx.fillStyle = '#6e113a';
        ctx.fillRect(graphRight + 5, sellY - 9, 140, 18);
        ctx.fillStyle = '#ff4f9f';
        ctx.font = `bold 11px monospace`;
        ctx.fillText(latestEntry.sell_price.toLocaleString(), graphRight + 12, sellY + 4);
    }

    ctx.strokeStyle = '#1c1d21';
    ctx.beginPath();
    ctx.moveTo(30, graphBottom + 10);
    ctx.lineTo(width - 30, graphBottom + 10);
    ctx.stroke();

    ctx.fillStyle = '#8e9297';
    ctx.font = `11px ${fontFamily}`;
    ctx.fillText('5y   1y   6m   3m   1m   5d   1d', 30, graphBottom + 32);

    const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC+7';
    ctx.textAlign = 'right';
    ctx.fillText(nowStr, width - 30, graphBottom + 32);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#141519';
    ctx.beginPath();
    ctx.roundRect(30, 540, 940, 180, 8);
    ctx.fill();

    const buy30m = getPriceAgo(history, 30, false) ?? currentBuy;
    const buy1h = getPriceAgo(history, 60, false) ?? currentBuy;
    const buy24h = currentBuy / (1 + (item.pct_change_24h ?? 0) / 100);

    const sell30m = getPriceAgo(history, 30, true) ?? currentSell;
    const sell1h = getPriceAgo(history, 60, true) ?? currentSell;
    const sell24h = currentSell / (1 + (item.pct_change_24h ?? 0) / 100);

    const formatDiff = (curr: number, prev: number) => {
        const diff = curr - prev;
        const pct = prev > 0 ? (diff / prev) * 100 : 0;
        return {
            text: `${diff >= 0 ? '+' : ''}${diff.toLocaleString()} (${diff >= 0 ? '+' : ''}${pct.toFixed(2)}%)`,
            isUp: diff >= 0
        };
    };

    const diffBuy30m = formatDiff(currentBuy, buy30m);
    const diffBuy1h = formatDiff(currentBuy, buy1h);
    const diffBuy24h = formatDiff(currentBuy, buy24h);

    const diffSell30m = formatDiff(currentSell, sell30m);
    const diffSell1h = formatDiff(currentSell, sell1h);
    const diffSell24h = formatDiff(currentSell, sell24h);

    const colWidth = 450;
    const yStart = 570;
    const yGap = 30;

    ctx.fillStyle = '#7a7e85';
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.fillText('Instant Sell Price', 50, yStart);
    ctx.fillText('30m Price Change', 50, yStart + yGap);
    ctx.fillText('1h Price Change', 50, yStart + yGap * 2);
    ctx.fillText('24h Price Change', 50, yStart + yGap * 3);

    ctx.fillStyle = '#ffb300';
    ctx.font = `bold 13px monospace`;
    ctx.fillText(`${currentSell.toLocaleString()} coins`, 230, yStart);

    const drawChangeText = (diff: { text: string; isUp: boolean }, x: number, y: number) => {
        ctx.fillStyle = diff.isUp ? '#09e099' : '#ff4a5a';
        ctx.font = `bold 12px monospace`;
        ctx.fillText(diff.text, x, y);
    };

    drawChangeText(diffSell30m, 230, yStart + yGap);
    drawChangeText(diffSell1h, 230, yStart + yGap * 2);
    drawChangeText(diffSell24h, 230, yStart + yGap * 3);

    const rightX1 = 510;
    const rightX2 = 690;
    ctx.fillStyle = '#7a7e85';
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.fillText('Instant-buy Price', rightX1, yStart);
    ctx.fillText('Spread Ratio', rightX1, yStart + yGap);
    ctx.fillText('Base Price', rightX1, yStart + yGap * 2);
    ctx.fillText('Buy Stopped', rightX1, yStart + yGap * 3);

    ctx.fillStyle = '#ffb300';
    ctx.font = `bold 13px monospace`;
    ctx.fillText(`${currentBuy.toLocaleString()} coins`, rightX2, yStart);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 12px monospace`;
    ctx.fillText(`${item.spread_ratio.toFixed(2)}x`, rightX2, yStart + yGap);
    ctx.fillText(`${item.base_price.toLocaleString()}`, rightX2, yStart + yGap * 2);
    
    ctx.fillStyle = item.buy_stopped ? '#ff4a5a' : '#09e099';
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.fillText(item.buy_stopped ? 'Yes' : 'No', rightX2, yStart + yGap * 3);

    return canvas.toBuffer('image/png');
}
