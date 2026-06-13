import { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, AttachmentBuilder, Message } from 'discord.js';
import { fetchItemsCached } from './src/itemlist.ts';
import { handleSearchItem } from './src/search.ts';
import { showHomeView, handleCategorySelection } from './src/home.ts';
import { handleTopSell } from './src/top_sell.ts';
import { generateHistoryGraphImage } from './src/history_price.ts';
import { generateDashboardImage } from './src/dash_board.ts';
import { handleMostSell } from './src/most_sell.ts';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('clientReady', async () => {
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
                name: 'most_sell',
                description: 'แสดง 5 อันดับสินค้าที่มีปริมาณการขายสูงสุดใน 24 ชั่วโมง'
            },
            {
                name: 'search',
                description: 'ค้นหาข้อมูลสินค้าใน Rogerland Market',
                options: [
                    {
                        name: 'query',
                        description: 'ชื่อสินค้า หรือ ID ที่ต้องการค้นหา',
                        type: 3,
                        required: true,
                        autocomplete: true
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
                        type: 3,
                        required: true,
                        autocomplete: true
                    }
                ]
            },
            {
                name: 'history_price',
                description: 'แสดงกราฟประวัติราคาสินค้า (Statbot Style)',
                options: [
                    {
                        name: 'query',
                        description: 'ชื่อสินค้า หรือ ID ที่ต้องการดูประวัติราคา',
                        type: 3,
                        required: true,
                        autocomplete: true
                    }
                ]
            },
            {
                name: 'dashboard',
                description: 'แสดงแดชบอร์ดข้อมูลประวัติราคาและการเปลี่ยนแปลง (Bazaar Style)',
                options: [
                    {
                        name: 'query',
                        description: 'ชื่อสินค้า หรือ ID ที่ต้องการดูแดชบอร์ด',
                        type: 3,
                        required: true,
                        autocomplete: true
                    }
                ]
            }
        ];

        console.log('Registering global slash commands...');
        await client.application?.commands.set(commands);
        console.log('Slash commands registered globally!');

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

async function handleHistoryCommand(interaction: any, query: string) {
    await interaction.deferReply();
    try {
        const items = await fetchItemsCached() as any[];
        const item = items.find(i => i.mc_id === query || i.name_th.toLowerCase().includes(query.toLowerCase()) || i.mc_id.toLowerCase().includes(query.toLowerCase()));
        if (!item) {
            await interaction.editReply(`❌ ไม่พบสินค้าที่ตรงกับคำค้นหา: \`${query}\``);
            return;
        }
        const buffer = await generateHistoryGraphImage(item, item.history || []);
        const attachment = new AttachmentBuilder(buffer, { name: 'history_price.png' });
        await interaction.editReply({ files: [attachment] });
    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ เกิดข้อผิดพลาด: ${(error as Error).message}`);
    }
}

async function handleDashboardCommand(interaction: any, query: string) {
    await interaction.deferReply();
    try {
        const items = await fetchItemsCached() as any[];
        const item = items.find(i => i.mc_id === query || i.name_th.toLowerCase().includes(query.toLowerCase()) || i.mc_id.toLowerCase().includes(query.toLowerCase()));
        if (!item) {
            await interaction.editReply(`❌ ไม่พบสินค้าที่ตรงกับคำค้นหา: \`${query}\``);
            return;
        }
        const buffer = await generateDashboardImage(item, item.history || []);
        const attachment = new AttachmentBuilder(buffer, { name: 'dashboard.png' });
        await interaction.editReply({ files: [attachment] });
    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ เกิดข้อผิดพลาด: ${(error as Error).message}`);
    }
}

async function handleHistoryMessage(msg: Message, query: string) {
    if (!query) {
        msg.reply('ℹ️ วิธีใช้: `!history <ชื่อสินค้า หรือ ID>`');
        return;
    }
    const loading = await msg.reply('⏳ กำลังสร้างกราฟประวัติราคา...');
    try {
        const items = await fetchItemsCached() as any[];
        const item = items.find(i => i.mc_id === query || i.name_th.toLowerCase().includes(query.toLowerCase()) || i.mc_id.toLowerCase().includes(query.toLowerCase()));
        if (!item) {
            await loading.edit(`❌ ไม่พบสินค้าที่ตรงกับคำค้นหา: \`${query}\``);
            return;
        }
        const buffer = await generateHistoryGraphImage(item, item.history || []);
        const attachment = new AttachmentBuilder(buffer, { name: 'history_price.png' });
        await loading.delete();
        await msg.reply({ files: [attachment] });
    } catch (error) {
        console.error(error);
        await loading.edit(`❌ เกิดข้อผิดพลาด: ${(error as Error).message}`);
    }
}

async function handleDashboardMessage(msg: Message, query: string) {
    if (!query) {
        msg.reply('ℹ️ วิธีใช้: `!dashboard <ชื่อสินค้า หรือ ID>`');
        return;
    }
    const loading = await msg.reply('⏳ กำลังสร้างแดชบอร์ด...');
    try {
        const items = await fetchItemsCached() as any[];
        const item = items.find(i => i.mc_id === query || i.name_th.toLowerCase().includes(query.toLowerCase()) || i.mc_id.toLowerCase().includes(query.toLowerCase()));
        if (!item) {
            await loading.edit(`❌ ไม่พบสินค้าที่ตรงกับคำค้นหา: \`${query}\``);
            return;
        }
        const buffer = await generateDashboardImage(item, item.history || []);
        const attachment = new AttachmentBuilder(buffer, { name: 'dashboard.png' });
        await loading.delete();
        await msg.reply({ files: [attachment] });
    } catch (error) {
        console.error(error);
        await loading.edit(`❌ เกิดข้อผิดพลาด: ${(error as Error).message}`);
    }
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        try {
            const items = await fetchItemsCached();
            
            const filtered = items.filter(item => {
                const cleanId = item.mc_id.toLowerCase().replace(/^[^:]+:/, '');
                return item.name_th.toLowerCase().includes(focusedValue) ||
                       cleanId.includes(focusedValue) ||
                       item.mc_id.toLowerCase().includes(focusedValue);
            });
            
            const choices = filtered.slice(0, 25).map(item => {
                const cleanId = item.mc_id.replace(/^[^:]+:/, '');
                return {
                    name: `${item.name_th} (${cleanId})`,
                    value: item.mc_id
                };
            });
            
            await interaction.respond(choices);
        } catch (error) {
            console.error('Error responding to autocomplete:', error);
        }
        return;
    }

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

    if (interaction.isModalSubmit()) {
        const { customId } = interaction;
        if (customId === 'search_modal') {
            const query = interaction.fields.getTextInputValue('search_query');
            await handleSearchItem(interaction, query);
        }
        return;
    }

    if (interaction.isStringSelectMenu()) {
        const { customId } = interaction;
        if (customId === 'category_select') {
            await interaction.deferUpdate();
            await handleCategorySelection(interaction, interaction.values[0]!);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'home' || commandName === 'itemlist') {
        await showHomeView(interaction);
    } else if (commandName === 'top_sell') {
        await handleTopSell(interaction);
    } else if (commandName === 'most_sell') {
        await handleMostSell(interaction);
    } else if (commandName === 'search' || commandName === 'check') {
        const query = interaction.options.getString('query', true);
        await handleSearchItem(interaction, query);
    } else if (commandName === 'history_price') {
        const query = interaction.options.getString('query', true);
        await handleHistoryCommand(interaction, query);
    } else if (commandName === 'dashboard') {
        const query = interaction.options.getString('query', true);
        await handleDashboardCommand(interaction, query);
    }
});

client.on('messageCreate', (msg) => {
    if (msg.content === '!ping') {
        msg.reply('Pong!');
    } else if (msg.content === '!home' || msg.content === '!itemlist') {
        showHomeView(msg);
    } else if (msg.content === '!top_sell') {
        handleTopSell(msg);
    } else if (msg.content === '!most_sell') {
        handleMostSell(msg);
    } else if (msg.content === '!search' || msg.content.startsWith('!search ')) {
        const query = msg.content === '!search' ? '' : msg.content.slice(8).trim();
        handleSearchItem(msg, query);
    } else if (msg.content === '!check' || msg.content.startsWith('!check ')) {
        const query = msg.content === '!check' ? '' : msg.content.slice(7).trim();
        handleSearchItem(msg, query);
    } else if (msg.content === '!history_price' || msg.content.startsWith('!history_price ') || msg.content === '!history' || msg.content.startsWith('!history ')) {
        const isHistoryShort = msg.content.startsWith('!history ') && !msg.content.startsWith('!history_price');
        const sliceLen = isHistoryShort ? 9 : 15;
        const query = msg.content.slice(sliceLen).trim();
        handleHistoryMessage(msg, query);
    } else if (msg.content === '!dashboard' || msg.content.startsWith('!dashboard ') || msg.content === '!dash' || msg.content.startsWith('!dash ')) {
        const isDashShort = msg.content.startsWith('!dash ') && !msg.content.startsWith('!dashboard');
        const sliceLen = isDashShort ? 6 : 11;
        const query = msg.content.slice(sliceLen).trim();
        handleDashboardMessage(msg, query);
    }
});

client.login(process.env.DISCORD_TOKEN);