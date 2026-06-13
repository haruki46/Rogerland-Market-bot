import { Message, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from 'discord.js';

const activeCollectors = new Map<string, any>();

export async function attachTimeout(target: any, response: any, rows: any[]) {
    try {
        const message = 'fetchReply' in target ? await target.fetchReply() : response;
        if (!message) return;

        const messageId = message.id;
        const existing = activeCollectors.get(messageId);
        if (existing) {
            existing.stop('superceded');
        }

        const collector = message.createMessageComponentCollector({
            idle: 180000
        });

        activeCollectors.set(messageId, collector);

        collector.on('end', async (_collected: any, reason: string) => {
            activeCollectors.delete(messageId);
            if (reason === 'superceded') return;

            try {
                const disabledRows = rows.map(row => {
                    if (row.components[0] instanceof StringSelectMenuBuilder) {
                        const disabledSelect = new StringSelectMenuBuilder()
                            .setCustomId('disabled_select')
                            .setPlaceholder('Disabled due to timeout...')
                            .setDisabled(true)
                            .addOptions([
                                {
                                    label: 'Disabled due to timeout...',
                                    value: 'disabled'
                                }
                            ]);
                        return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledSelect);
                    } else {
                        const disabledButtons = row.components.map((btn: any) => 
                            ButtonBuilder.from(btn).setDisabled(true)
                        );
                        return new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButtons);
                    }
                });

                await message.edit({
                    components: disabledRows
                });
            } catch {
            }
        });
    } catch {
    }
}
