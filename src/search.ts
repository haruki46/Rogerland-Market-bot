import { Message, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { getItemImagePath } from './itemlist.ts';
import type { MarketItem } from './itemlist.ts';
import { attachTimeout } from './timeout.ts';

interface ApiResponse {
    items: MarketItem[];
}

export async function handleSearchItem(target: Message | ChatInputCommandInteraction | ModalSubmitInteraction, query: string) {
    const isInteraction = !('content' in target);

    if (!query) {
        const msg = 'ℹ️ วิธีใช้: `/search <ชื่อสินค้า หรือ ID>` (เช่น `/search query: หัวใจ` หรือ `/search query: heart_of_the_sea`)';
        if (isInteraction) {
            await (target as any).reply({ content: msg, flags: MessageFlags.Ephemeral });
        } else {
            await (target as Message).reply(msg);
        }
        return;
    }

    const apiUrl = process.env.ROGERLAND_API;
    if (!apiUrl) {
        const msg = '❌ Error: `ROGERLAND_API` is not set in environmental variables.';
        if (isInteraction) {
            await (target as any).reply({ content: msg, flags: MessageFlags.Ephemeral });
        } else {
            await (target as Message).reply(msg);
        }
        return;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API responded with status code ${response.status}`);
        }
        
        const data = (await response.json()) as ApiResponse;
        if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid response structure from API.');
        }

        const lowercaseQuery = query.toLowerCase();
        
        const matchedItems = data.items.filter(item => 
            item.name_th.toLowerCase().includes(lowercaseQuery) || 
            item.mc_id.toLowerCase().includes(lowercaseQuery)
        );

        if (matchedItems.length === 0) {
            const msg = `❌ ไม่พบสินค้าที่ตรงกับคำค้นหา: \`${query}\``;
            if (isInteraction) {
                await (target as any).reply({ content: msg, flags: MessageFlags.Ephemeral });
            } else {
                await (target as Message).reply(msg);
            }
            return;
        }

        if (isInteraction) {
            await (target as any).deferReply();
        }

        const maxDisplay = 5;
        const itemsToRender = matchedItems.slice(0, maxDisplay);

        const embeds = [];
        const files: AttachmentBuilder[] = [];

        for (const item of itemsToRender) {
            const imagePath = getItemImagePath(item.mc_id);
            const cleanId = item.mc_id.split(':').pop() || item.mc_id;
            const fileName = `${cleanId}.png`;

            const embed: any = {
                title: '🛒 Rogerland Market',
                description: `**Item name :** ${item.name_th}\n` +
                             `**Item Id:** ${cleanId}\n` +
                             `🛒 **Buy:** ${item.buy_price} | **Sell:** ${item.sell_price}\n` +
                             `📊 **Base:** ${item.base_price} | **Spread:** ${item.spread_ratio}`,
                color: 0x5865F2,
            };

            if (imagePath) {
                embed.thumbnail = { url: `attachment://${fileName}` };
                files.push(new AttachmentBuilder(imagePath, { name: fileName }));
            }
            embeds.push(embed);
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('search_modal_trigger')
                .setLabel('Search')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('back')
                .setLabel('back')
                .setStyle(ButtonStyle.Danger),
        );

        const suffix = matchedItems.length > maxDisplay ? `\n*แสดงผล 5 รายการแรกจากทั้งหมด ${matchedItems.length} รายการ*` : '';

        const payload = {
            content: `**ผลการค้นหาสำหรับ: "${query}"**${suffix}`,
            embeds: embeds,
            files: files,
            components: [row]
        };

        let msgResponse: any;
        if (isInteraction) {
            msgResponse = await (target as any).editReply(payload);
        } else {
            msgResponse = await (target as Message).reply(payload);
        }
        await attachTimeout(target, msgResponse, [row]);

    } catch (error) {
        console.error('Error searching item:', error);
        const errMsg = `**เกิดข้อผิดพลาดในการดึงข้อมูล: ${(error as Error).message}**`;
        if (isInteraction) {
            const intTarget = target as any;
            if (intTarget.deferred || intTarget.replied) {
                await intTarget.editReply({ content: errMsg });
            } else {
                await intTarget.reply({ content: errMsg, flags: MessageFlags.Ephemeral });
            }
        } else {
            await (target as Message).reply(errMsg);
        }
    }
}
