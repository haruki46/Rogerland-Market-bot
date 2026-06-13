# Rogerbot - Rogerland Market Discord Bot

### ⚙️ Installation

1. **Install Dependencies:**
   ```bash
   bun install
   npm install
   ```

2. **Configure Environment Variables (`.env`):**
   Create/update the `.env` file in the root folder with:
   ```env
   DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN"
   ROGERLAND_API="https://rglshop.rogerfilms.com/shop/api/market-prices"
   ```
   *Note: Ensure the bot is granted **Manage Emojis and Stickers** permission and **Message Content Intent** is enabled in the Discord Developer Portal.*

3. **Start the Bot:**
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

## 📁 File Structure 
└── rogerbot/
    ├── home.ts
    ├── index.ts
    ├── itemlist.ts
    ├── package.json
    ├── README.md
    ├── search.ts
    ├── top_sell.ts
    ├── tsconfig.json
    └── item
