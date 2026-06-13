# 🤖 Rogerbot - Rogerland Market Discord Bot

A premium, interactive Discord bot for checking and searching live item prices in the Rogerland Market. Built using **Discord.js v14**, **Bun**, and custom canvas rendering.

บอท Discord สำหรับตรวจสอบและค้นหาราคาสินค้าตลาด Rogerland Market แบบเรียลไทม์ พัฒนาด้วย **Discord.js v14**, **Bun**, และการวาดรูปภาพแบบ Canvas (ประสิทธิภาพสูง)

---

## 🇹🇭 คู่มือการใช้งานภาษาไทย (Thai Guide)

### 📌 คุณสมบัติเด่น (Features)
* **หน้าต่างเมนูหลักแบบโต้ตอบ (Home Dashboard):** ใช้ระบบ Dropdown เมนูและปุ่มกดของ Discord เพื่อเลือกดูหมวดหมู่สินค้าต่าง ๆ ได้ทันที
* **การวาดรูปภาพสินค้า Canvas:** เมื่อเลือกหมวดหมู่ บอทจะสร้างและส่งรูปภาพแสดงราคาสินค้าเป็นตาราง 3 คอลัมน์ที่สวยงาม โดยมีไอคอนของเล่น/บล็อกตามจริงจากตัวเกม Minecraft
* **ระบบค้นหาแบบ Modal:** คลิกปุ่ม "Search" บอทจะเปิดหน้าต่างข้อความให้พิมพ์ค้นหา และแสดงราคาสินค้าพร้อมรูปภาพประกอบด้านขวาอย่างสวยงาม
* **ระบบกรอกข้อความอัตโนมัติ (Slash Command Autocomplete):** เมื่อพิมพ์ `/search` หรือ `/check` บอทจะแสดงคำแนะนำสินค้าทั้งหมดขณะกำลังพิมพ์
* **ระบบแคชข้อมูล:** มีระบบ Cache ข้อมูลราคาตลาด 60 วินาที เพื่อเพิ่มความเร็วในการตอบสนองและป้องกันการส่งคำขอไปยัง API ถี่เกินไป

### ⚙️ วิธีการติดตั้ง (Installation)

1. **ติดตั้ง Bun Runtime** (หากยังไม่ได้ติดตั้ง):
   ```bash
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **ติดตั้ง Dependencies:**
   ```bash
   bun install
   ```

3. **ตั้งค่า Environment Variables (`.env`):**
   สร้างหรือแก้ไขไฟล์ `.env` ในโฟลเดอร์หลัก และตั้งค่าดังนี้:
   ```env
   DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN"
   ROGERLAND_API="https://rglshop.rogerfilms.com/shop/api/market-prices"
   ```
   *หมายเหตุ: บอทต้องการสิทธิ์ **Manage Emojis and Stickers** และเปิดใช้งาน **Message Content Intent** ใน Discord Developer Portal เพื่อการทำงานที่สมบูรณ์*

4. **เริ่มการทำงานบอท (Run):**
   ```bash
   bun run index.ts
   ```

### 🎮 คำสั่งใช้งาน (Commands)

#### 💻 คำสั่งแบบ Slash Command (พิมพ์ `/`)
* `/home` หรือ `/itemlist`: เปิดหน้าต่างหน้าแรก (Home Dashboard) เพื่อเลือกดูราคาแยกตามหมวดหมู่
* `/search <ชื่อสินค้า>` หรือ `/check <ชื่อสินค้า>`: ค้นหาข้อมูลราคาสินค้าที่ต้องการแบบระบุชื่อ

#### 💬 คำสั่งแบบพิมพ์แชทปกติ (พิมพ์ `!`)
* `!home` หรือ `!itemlist`: เปิดหน้าแรกเพื่อดูหมวดหมู่
* `!search <ชื่อสินค้า>` หรือ `!check <ชื่อสินค้า>`: ค้นหาราคาสินค้า

---

## 🇺🇸 English Guide (คู่มือภาษาอังกฤษ)

### 📌 Features
* **Interactive Home Dashboard:** Uses native Discord dropdown select menus and buttons to navigate categories.
* **Canvas Grid Image Generation:** Displays prices in a clean, 3-column generated image containing real Minecraft item icons loaded from the local folder.
* **Modal Search Input:** Click the "Search" button to open a modal popup, enter any item name, and receive a beautiful embed with details and a right-aligned thumbnail.
* **Slash Command Autocomplete:** Displays instant suggestions as you type `/search query:` or `/check query:`.
* **Smart API Caching:** Caches the Rogerland Market prices for 60 seconds to avoid API spamming and maintain high responsiveness.

### ⚙️ Installation

1. **Install Bun Runtime** (if not already installed):
   ```bash
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **Install Dependencies:**
   ```bash
   bun install
   ```

3. **Configure Environment Variables (`.env`):**
   Create/update the `.env` file in the root folder with:
   ```env
   DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN"
   ROGERLAND_API="https://rglshop.rogerfilms.com/shop/api/market-prices"
   ```
   *Note: Ensure the bot is granted **Manage Emojis and Stickers** permission and **Message Content Intent** is enabled in the Discord Developer Portal.*

4. **Start the Bot:**
   ```bash
   bun run index.ts
   ```

### 🎮 Commands Usage

#### 💻 Slash Commands (`/`)
* `/home` or `/itemlist`: Opens the Home Dashboard to select price lists by category.
* `/top_sell`: Displays the top 5 most profitable items by sell profit.
* `/search <query>` or `/check <query>`: Searches for a specific item's details.

#### 💬 Chat Text Commands (`!`)
* `!home` or `!itemlist`: Opens the Home Dashboard menu.
* `!top_sell`: Displays the top 5 most profitable items by sell profit.
* `!search <query>` or `!check <query>`: Searches for market items.

---

## 📁 File Structure / โครงสร้างไฟล์
* [index.ts](file:///c:/Users/RhythmOwO/Desktop/rogerbot/index.ts) - Main entrypoint, handles event registrations, slash command updates, and routing.
* [home.ts](file:///c:/Users/RhythmOwO/Desktop/rogerbot/home.ts) - Renders the dashboard panels and handles category dropdown picking.
* [top_sell.ts](file:///c:/Users/RhythmOwO/Desktop/rogerbot/top_sell.ts) - Renders the top 5 sell profit leaderboard with ranking emojis and item thumbnails.
* [search.ts](file:///c:/Users/RhythmOwO/Desktop/rogerbot/search.ts) - Renders search/check results utilizing embeds, thumbnails, and button configurations.
* [itemlist.ts](file:///c:/Users/RhythmOwO/Desktop/rogerbot/itemlist.ts) - Main market caching helper, checks local image files, and draws item grid canvas images.
* `item/` - Directory containing PNG assets of active items.
