import { Message, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ModalSubmitInteraction, MessageComponentInteraction } from 'discord.js';
import { fetchItemsCached, getItemImagePath } from './itemlist.ts';
import { attachTimeout } from './timeout.ts';

export async function handleMostSell(target: Message | ChatInputCommandInteraction | ModalSubmitInteraction | MessageComponentInteraction) {
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
                volume_sold: (item as any).volume_sold_24h || 0
            }))
            .sort((a, b) => b.volume_sold - a.volume_sold);

        const top5 = sortedItems.slice(0, 5);
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        const embed: any = {
            title: '📊 Rogerland Market | Top 5 Most Sold (24h)',
            description: 'จัดอันดับ 5 สินค้าที่มีปริมาณการขาย (Sell Volume) สูงสุดใน 24 ชั่วโมงที่ผ่านมา\n',
            color: 0x5865f2,
            fields: top5.map((item, idx) => {
                const cleanId = item.mc_id.split(':').pop() || item.mc_id;
                return {
                    name: `${medals[idx]} **${item.name_th}**`,
                    value: `• ID: \`${cleanId}\`\n` +
                           `• ปริมาณการขาย (Sell Volume): **${item.volume_sold.toLocaleString()}**\n` +
                           `• 🛒 Buy: **${item.buy_price.toLocaleString()}** | Sell: **${item.sell_price.toLocaleString()}**\n` +
                           `• Spread: \`${item.spread_ratio.toFixed(2)}x\``,
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
        console.error('Error rendering top most sell volume leaderboard:', error);
        const errMsg = `** เกิดข้อผิดพลาดในการดึงข้อมูล: ${(error as Error).message}**`;
        if (isInteraction) {
            await (target as any).editReply({ content: errMsg });
        } else {
            await (target as Message).reply(errMsg);
        }
    }
}
