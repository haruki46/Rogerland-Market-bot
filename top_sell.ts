import { Message, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ModalSubmitInteraction, MessageComponentInteraction } from 'discord.js';
import { fetchItemsCached, getItemImagePath } from './itemlist.ts';

// Handle Top 5 Sell Profit leaderboard
export async function handleTopSell(target: Message | ChatInputCommandInteraction | ModalSubmitInteraction | MessageComponentInteraction) {
    const isInteraction = !('content' in target);

    if (isInteraction && !(target as any).deferred && !(target as any).replied) {
        await (target as any).deferReply();
    }

    try {
        const items = await fetchItemsCached();
        if (items.length === 0) {
            throw new Error('Could not fetch market items.');
        }

        // Map items and calculate the profit (sell_price - buy_price)
        const sortedItems = items
            .map(item => ({
                ...item,
                profit: item.sell_price - item.buy_price
            }))
            .sort((a, b) => b.profit - a.profit);

        const top5 = sortedItems.slice(0, 5);
        
        // Emojis for ranking
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        const embed: any = {
            title: '🔥 Rogerland Market | Top 5 Sell Profit',
            description: 'จัดอันดับ 5 สินค้าที่มีกำไรส่วนต่างจากการขายสูงสุดในขณะนี้\n*(คำนวณจาก ราคาขาย - ราคารับซื้อ)*\n',
            color: 0xffa500, // Orange
            fields: top5.map((item, idx) => ({
                name: `${medals[idx]} **${item.name_th}**`,
                value: `• ID: \`${item.mc_id.replace('minecraft:', '')}\`\n` +
                       `• กำไร (Profit): **+${item.profit}**\n` +
                       `• 🛒 Buy: **${item.buy_price}** | Sell: **${item.sell_price}**\n` +
                       `• Spread: \`${item.spread_ratio}\``,
                inline: false
            }))
        };

        const files: AttachmentBuilder[] = [];

        // Attach image of the #1 profitable item as embed thumbnail
        if (top5[0]) {
            const firstItemImagePath = getItemImagePath(top5[0].mc_id);
            if (firstItemImagePath) {
                const fileName = top5[0].mc_id.replace('minecraft:', '') + '.png';
                embed.thumbnail = { url: `attachment://${fileName}` };
                files.push(new AttachmentBuilder(firstItemImagePath, { name: fileName }));
            }
        }

        // Add back button to go back to Home
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('back')
                .setLabel('back')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('search_modal_trigger')
                .setLabel('Search')
                .setStyle(ButtonStyle.Success)
        );

        const payload = {
            content: '',
            embeds: [embed],
            files: files,
            components: [row]
        };

        if (isInteraction) {
            await (target as any).editReply(payload);
        } else {
            await (target as Message).reply(payload);
        }

    } catch (error) {
        console.error('Error rendering top sell profit leaderboard:', error);
        const errMsg = `❌ เกิดข้อผิดพลาดในการดึงข้อมูล: ${(error as Error).message}`;
        if (isInteraction) {
            await (target as any).editReply({ content: errMsg });
        } else {
            await (target as Message).reply(errMsg);
        }
    }
}
