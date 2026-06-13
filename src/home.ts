import { Message, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageComponentInteraction, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { generateGridImage, fetchItemsCached } from './itemlist.ts';
import type { MarketItem } from './itemlist.ts';
import { handleTopSell } from './top_sell.ts';
import { attachTimeout } from './timeout.ts';

function getCategoryItems(items: MarketItem[], category: string): MarketItem[] {
    switch (category) {
        case 'category_block':
            return items.filter(item => item.mc_id.includes('wool'));
        case 'category_farm':
            const farmKeywords = ['wheat', 'carrot', 'potato', 'melon', 'pumpkin', 'beetroot', 'mushroom', 'fungus', 'wart', 'chorus_fruit'];
            return items.filter(item => farmKeywords.some(kw => item.mc_id.includes(kw)));
        case 'category_fish':
            const fishKeywords = ['fish', 'cod', 'salmon', 'pufferfish'];
            return items.filter(item => fishKeywords.some(kw => item.mc_id.includes(kw)));
        case 'category_meat':
            const meatKeywords = ['beef', 'pork', 'mutton', 'chicken', 'rabbit'];
            return items.filter(item => meatKeywords.some(kw => item.mc_id.includes(kw)));
        case 'category_mod':
            return items.filter(item => item.mc_id.includes('tastyvanilla'));
        default:
            return [];
    }
}

export async function showHomeView(target: Message | ChatInputCommandInteraction | MessageComponentInteraction, edit = false) {
    const embed = {
        title: '🏠 Rogerland Market | Home',
        description: 'ยินดีต้อนรับสู่ Rogerland Market Dashboard!\nกรุณาเลือกหมวดหมู่ที่ต้องการจากเมนูด้านล่างเพื่อดูราคาสินค้า',
        color: 0x5865F2
    };

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('เลือกหมวดหมู่สินค้า...')
        .addOptions([
            {
                    label: 'Top 5 Sell Profit',
                    value: 'category_top_sell',
                    description: 'แสดง 5 อันดับสินค้าที่มีกำไรจากการขายสูงสุด',
                    emoji: '🔥'
            },
            {
                label: 'Block (All Wool)',
                value: 'category_block',
                description: 'แสดงราคาบล็อกขนแกะทั้งหมด',
                emoji: '📦'
            },
            {                
                label: 'Farm (Crops & Fungus)',
                value: 'category_farm',
                description: 'แสดงราคาสินค้าเกษตร ข้าว แครอท แตงโม เห็ด ฯลฯ',
                emoji: '🌾'
            },
            {
                label: 'Fish (All Seafood)',
                value: 'category_fish',
                description: 'แสดงราคาปลาและอาหารทะเลดิบ/ปรุงสุกทั้งหมด',
                emoji: '🐟'
            },
            {
                label: 'Meat (All Livestock)',
                value: 'category_meat',
                description: 'แสดงราคาเนื้อสัตว์ วัว หมู แกะ ไก่ กระต่าย',
                emoji: '🥩'
            },
            {
                label: 'Tasty Vanilla (Modded Food)',
                value: 'category_mod',
                description: 'แสดงราคาอาหารและพืชผลจากมอด Tasty Vanilla',
                emoji: '🍅'
            },
        ]);

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('home_btn')
            .setLabel('Home')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('search_modal_trigger')
            .setLabel('Search')
            .setStyle(ButtonStyle.Secondary)
    );

    const payload = {
        content: '',
        embeds: [embed],
        files: [],
        attachments: [],
        components: [row1, row2]
    };

    let response: any;
    if (edit && 'update' in target) {
        response = await (target as MessageComponentInteraction).update(payload);
    } else if ('reply' in target) {
        response = await (target as any).reply(payload);
    }
    await attachTimeout(target, response, [row1, row2]);
}

export async function handleCategorySelection(interaction: MessageComponentInteraction, category: string) {
    if (category === 'category_top_sell') {
        await handleTopSell(interaction);
        return;
    }

    try {
        const items = await fetchItemsCached();
        const categoryItems = getCategoryItems(items, category);

        if (categoryItems.length === 0) {
            await interaction.followUp({ content: '** ไม่พบรายการสินค้าในหมวดหมู่นี้**', flags: MessageFlags.Ephemeral });
            return;
        }

        let categoryName = '';
        switch (category) {
            case 'category_block': categoryName = 'Block (All Wool)'; break;
            case 'category_farm': categoryName = 'Farm (Crops & Fungus)'; break;
            case 'category_fish': categoryName = 'Fish (All Seafood)'; break;
            case 'category_meat': categoryName = 'Meat (All Livestock)'; break;
            case 'category_mod': categoryName = 'Tasty Vanilla (Modded Food)'; break;
        }

        const imageBuffer = await generateGridImage(categoryItems, categoryName);
        const fileName = `${category}.png`;
        const attachment = new AttachmentBuilder(imageBuffer, { name: fileName });

        const embed = {
            title: `📊 หมวดหมู่: ${categoryName}`,
            description: `แสดงราคาสินค้าในหมวดหมู่ **${categoryName}** ทั้งหมดจำนวน ${categoryItems.length} รายการ`,
            color: 0x5865F2,
            image: { url: `attachment://${fileName}` }
        };

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

        const response = await interaction.editReply({
            content: '',
            embeds: [embed],
            files: [attachment],
            components: [row]
        });
        await attachTimeout(interaction, response, [row]);

    } catch (error) {
        console.error('Error handling category selection:', error);
        await interaction.followUp({ content: `** เกิดข้อผิดพลาด: ${(error as Error).message}**`, flags: MessageFlags.Ephemeral });
    }
}
