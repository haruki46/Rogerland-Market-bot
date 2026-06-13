import { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { fetchItemsCached } from './itemlist.ts';
import { handleSearchItem } from './search.ts';
import { showHomeView, handleCategorySelection } from './home.ts';
import { handleTopSell } from './top_sell.ts';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Required to read message.content in Discord.js v14+
    ]
});

client.on('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    try {
        const commands = [
            {
                name: 'home',
                description: 'เปิดเมนูหลักและเลือกดูราคาสินค้าตามหมวดหมู่'
            },
            {
                name: 'itemlist',
                description: 'แสดงเมนูหลักรายการราคาสินค้า'
            },
            {
                name: 'top_sell',
                description: 'แสดง 5 อันดับสินค้าที่มีกำไรจากการขายสูงสุด'
            },
            {
                name: 'search',
                description: 'ค้นหาข้อมูลสินค้าใน Rogerland Market',
                options: [
                    {
                        name: 'query',
                        description: 'ชื่อสินค้า หรือ ID ที่ต้องการค้นหา',
                        type: 3, // String type
                        required: true,
                        autocomplete: true // Enable auto-complete
                    }
                ]
            },
            {
                name: 'check',
                description: 'ตรวจสอบข้อมูลสินค้าใน Rogerland Market',
                options: [
                    {
                        name: 'query',
                        description: 'ชื่อสินค้า หรือ ID ที่ต้องการค้นหา',
                        type: 3, // String type
                        required: true,
                        autocomplete: true // Enable auto-complete
                    }
                ]
            }
        ];

        console.log('Registering global slash commands...');
        await client.application?.commands.set(commands);
        console.log('Slash commands registered globally!');

        // Clear guild-level commands to avoid duplicates (relying on global registration instead)
        const guilds = await client.guilds.fetch();
        for (const [guildId, guild] of guilds) {
            try {
                const fullGuild = await guild.fetch();
                await fullGuild.commands.set([]);
                console.log(`Cleared guild-level slash commands for: ${fullGuild.name}`);
            } catch (err) {
                console.warn(`Could not clear guild-level commands for guild ${guildId}:`, (err as Error).message);
            }
        }
    } catch (error) {
        console.error('Error setting up slash commands:', error);
    }
});

// Handle Slash Command Interactions, Autocomplete, Buttons, and Select Menus
client.on('interactionCreate', async (interaction) => {
    // 1. Handle Autocomplete Suggestions
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        try {
            const items = await fetchItemsCached();
            
            // Filter list matching user input
            const filtered = items.filter(item => 
                item.name_th.toLowerCase().includes(focusedValue) ||
                item.mc_id.toLowerCase().replace('minecraft:', '').includes(focusedValue)
            );
            
            // Map to Discord choices (max 25 choices allowed by Discord API)
            const choices = filtered.slice(0, 25).map(item => ({
                name: `${item.name_th} (${item.mc_id.replace('minecraft:', '')})`,
                value: item.mc_id
            }));
            
            await interaction.respond(choices);
        } catch (error) {
            console.error('Error responding to autocomplete:', error);
        }
        return;
    }

    // 2. Handle Button Clicks
    if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId === 'back') {
            await showHomeView(interaction, true);
        } else if (customId === 'search_modal_trigger') {
            const modal = new ModalBuilder()
                .setCustomId('search_modal')
                .setTitle('Rogerland Market Search');

            const searchInput = new TextInputBuilder()
                .setCustomId('search_query')
                .setLabel('กรอกชื่อสินค้า หรือ Item ID')
                .setPlaceholder('เช่น หัวใจ, rabbit, apple, wool...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(searchInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }
        return;
    }

    // 3. Handle Modal Submissions
    if (interaction.isModalSubmit()) {
        const { customId } = interaction;
        if (customId === 'search_modal') {
            const query = interaction.fields.getTextInputValue('search_query');
            await handleSearchItem(interaction, query);
        }
        return;
    }

    // 4. Handle Select Menu selections
    if (interaction.isStringSelectMenu()) {
        const { customId } = interaction;
        if (customId === 'category_select') {
            await interaction.deferUpdate();
            await handleCategorySelection(interaction, interaction.values[0]!);
        }
        return;
    }

    // 5. Handle Chat Input Commands
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'home' || commandName === 'itemlist') {
        // Now /itemlist calls showHomeView directly, displaying the Home dashboard!
        await showHomeView(interaction);
    } else if (commandName === 'top_sell') {
        await handleTopSell(interaction);
    } else if (commandName === 'search' || commandName === 'check') {
        const query = interaction.options.getString('query', true);
        await handleSearchItem(interaction, query);
    }
});

// Fallback: Keep text message commands active as well
client.on('messageCreate', (msg) => {
    if (msg.content === '!ping') {
        msg.reply('Pong!');
    } else if (msg.content === '!home' || msg.content === '!itemlist') {
        // Now !itemlist calls showHomeView directly, displaying the Home dashboard!
        showHomeView(msg);
    } else if (msg.content === '!top_sell') {
        handleTopSell(msg);
    } else if (msg.content === '!search' || msg.content.startsWith('!search ')) {
        const query = msg.content === '!search' ? '' : msg.content.slice(8).trim();
        handleSearchItem(msg, query);
    } else if (msg.content === '!check' || msg.content.startsWith('!check ')) {
        const query = msg.content === '!check' ? '' : msg.content.slice(7).trim();
        handleSearchItem(msg, query);
    }
});

client.login(process.env.DISCORD_TOKEN);