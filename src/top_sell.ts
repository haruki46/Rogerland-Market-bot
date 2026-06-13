import { Message, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ModalSubmitInteraction, MessageComponentInteraction } from 'discord.js';
import { fetchItemsCached, getItemImagePath } from './itemlist.ts';
import { attachTimeout } from './timeout.ts';

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

        const sortedItems = items
            .map(item => ({
                ...item,
                profit: item.sell_price - item.buy_price
            }))
            .sort((a, b) => b.profit - a.profit);

        const top5 = sortedItems.slice(0, 5);
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        const embed: any = {
            title: '🔥 Rogerland Market | Top 5 Sell Profit',
            description: 'จัดอันดับ 5 สินค้าที่มีกำไรส่วนต่างจากการขายสูงสุดในขณะนี้\n*(คำนวณจาก ราคาขาย - ราคารับซื้อ)*\n',
            color: 0xffa500,
            fields: top5.map((item, idx) => {
                const cleanId = item.mc_id.split(':').pop() || item.mc_id;
                return {
                    name: `${medals[idx]} **${item.name_th}**`,
                    value: `• ID: \`${cleanId}\`\n` +
                           `• กำไร (Profit): **+${item.profit}**\n` +
                           `• 🛒 Buy: **${item.buy_price}** | Sell: **${item.sell_price}**\n` +
                           `• Spread: \`${item.spread_ratio}\``,
                    inline: false
                };
            })
        };

        const files: AttachmentBuilder[] = [];

        if (top5[0]) {
            const firstItemImagePath = getItemImagePath(top5[0].mc_id);
            if (firstItemImagePath) {
                const cleanName = top5[0].mc_id.split(':').pop() || top5[0].mc_id;
                const fileName = `${cleanName}.png`;
                embed.thumbnail = { url: `attachment://${fileName}` };
                files.push(new AttachmentBuilder(firstItemImagePath, { name: fileName }));
            }
        }

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

        let response: any;
        if (isInteraction) {
            response = await (target as any).editReply(payload);
        } else {
            response = await (target as Message).reply(payload);
        }
        await attachTimeout(target, response, [row]);

    } catch (error) {
        console.error('Error rendering top sell profit leaderboard:', error);
        const errMsg = `** เกิดข้อผิดพลาดในการดึงข้อมูล: ${(error as Error).message}**`;
        if (isInteraction) {
            await (target as any).editReply({ content: errMsg });
        } else {
            await (target as Message).reply(errMsg);
        }
    }
}
