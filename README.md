# Rogerbot - Rogerland Market Discord Bot

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
