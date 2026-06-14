import { fetchItemsCached, registerOnItemsUpdate } from '../src/itemlist.ts';
import { writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

// Load environment variables
dotenv.config();

// Ensure __dirname is available in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Date formatting helper: day/month/year 00:00:00 (24-hour format)
function format24hDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// CSV escape helper
function escapeCSV(val: any): string {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function collectPriceData(providedItems?: any[]) {
    console.log('Collecting price data...');
    const items = providedItems || (await fetchItemsCached());
    if (!items || items.length === 0) {
        console.error('Error: No items fetched from Rogerland API.');
        return;
    }

    const jsonRecords: any[] = [];
    const csvRowsList: any[][] = [];
    const wb = XLSX.utils.book_new();

    for (const item of items) {
        const mcId = item.mc_id;
        const cleanMcId = mcId.split(':').pop() || mcId;

        // Fetch history or fallback to the current price/time
        const rawHistory = item.history;
        const history = (rawHistory && rawHistory.length > 0) ? rawHistory : [
            { ts: new Date().toISOString(), buy_price: item.buy_price, sell_price: item.sell_price }
        ];

        const historyRecords = history.map((entry: any) => {
            const entryDate = new Date(entry.ts);
            const formattedDate = format24hDate(entryDate);
            const buyPrice = entry.buy_price !== undefined ? entry.buy_price : item.buy_price;
            const sellPrice = entry.sell_price !== undefined ? entry.sell_price : item.sell_price;
            return {
                "Price buy": buyPrice,
                "Price sell": sellPrice,
                "date": formattedDate
            };
        });

        // Add to JSON list
        jsonRecords.push({
            "mc_id": mcId,
            "History": historyRecords
        });

        // Add to CSV rows list
        for (const record of historyRecords) {
            csvRowsList.push([mcId, record["Price buy"], record["Price sell"], record.date]);
        }

        // Add to Excel worksheet
        const sheetData = historyRecords.map(record => ({
            "mc_id": mcId,
            "Price buy": record["Price buy"],
            "Price sell": record["Price sell"],
            "date": record.date
        }));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        // Truncate sheet name to 31 chars (Excel limitation)
        const sheetName = cleanMcId.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // Paths for output files
    const outputDir = join(__dirname);
    const jsonPath = join(outputDir, 'prices.json');
    const csvPath = join(outputDir, 'prices.csv');
    const xlsxPath = join(outputDir, 'prices.xlsx');

    // 1. Write JSON file
    writeFileSync(jsonPath, JSON.stringify(jsonRecords, null, 2), 'utf-8');
    console.log(`JSON file created/updated at: ${jsonPath}`);

    // 2. Write CSV file (combined)
    const csvHeaders = ['mc_id', 'Price buy', 'Price sell', 'date'];
    const csvRows = [
        csvHeaders.map(escapeCSV).join(','),
        ...csvRowsList.map(row => row.map(escapeCSV).join(','))
    ];
    writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');
    console.log(`Combined CSV file created/updated at: ${csvPath}`);

    // 3. Write Excel file
    XLSX.writeFile(wb, xlsxPath);
    console.log(`Excel file created/updated at: ${xlsxPath}`);

    // Clean up old individual item CSV files to avoid clutter
    try {
        const files = readdirSync(outputDir);
        for (const file of files) {
            if (file.endsWith('.csv') && file !== 'prices.csv') {
                unlinkSync(join(outputDir, file));
                console.log(`Cleaned up old individual CSV file: ${file}`);
            }
        }
    } catch (err) {
        console.error('Failed to clean up old CSV files:', err);
    }
}

const isRunDirectly = import.meta.main || 
    (process.argv[1] && (process.argv[1].endsWith('log/index.ts') || process.argv[1].endsWith('log\\index.ts') || process.argv[1].endsWith('log')));

if (!isRunDirectly) {
    // Register as listener for items updates
    registerOnItemsUpdate((items) => {
        collectPriceData(items).catch(err => {
            console.error('Error auto-logging prices in callback:', err);
        });
    });

    // Setup background interval to fetch items every 22 minutes (forces a cache update check)
    setInterval(async () => {
        try {
            console.log('Auto-logging check: querying cached/fresh API items...');
            await fetchItemsCached();
        } catch (err) {
            console.error('Error in background auto-log polling:', err);
        }
    }, 22 * 60 * 1000);
}

// Run the collection
if (isRunDirectly) {
    collectPriceData()
        .then(() => {
            process.exit(0);
        })
        .catch(err => {
            console.error('Failed to run collectPriceData:', err);
            process.exit(1);
        });
} else if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
    // Run initially on bot startup
    collectPriceData().catch(err => {
        console.error('Failed to run initial collectPriceData:', err);
    });
}
