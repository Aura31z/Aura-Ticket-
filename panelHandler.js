const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const GuildConfig = require('../database/models/GuildConfig');
const Ticket = require('../database/models/Ticket');
const Blacklist = require('../database/models/Blacklist');
const { errorEmbed } = require('../utils/embeds');

/**
 * Handle panel selection (StringSelectMenu or Button)
 * @param {import('discord.js').Interaction} interaction 
 */
async function handlePanelSelection(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Selected category ID
    let categoryId = null;
    if (interaction.isStringSelectMenu()) {
        categoryId = interaction.values[0];
    } else if (interaction.isButton()) {
        // Button customId format: ticket_select:panelId:categoryId
        const parts = interaction.customId.split(':');
        categoryId = parts[2];
    }

    if (!categoryId) return;

    // 1. Check if user is blacklisted
    const isBlacklisted = await Blacklist.findOne({ guildId, userId });
    if (isBlacklisted) {
        return interaction.reply({
            embeds: [errorEmbed('Access Denied', `You are blacklisted from opening tickets.\n**Reason:** ${isBlacklisted.reason}`)],
            ephemeral: true
        });
    }

    // 2. Fetch Guild Configuration
    const guildConfig = await GuildConfig.findOne({ guildId });
    if (!guildConfig) {
        return interaction.reply({
            embeds: [errorEmbed('Configuration Error', 'Ticket system is not configured on this server.')],
            ephemeral: true
        });
    }

    // Find category definition across panels
    let category = null;
    for (const panel of guildConfig.panels) {
        const found = panel.categories.find(cat => cat.id === categoryId);
        if (found) {
            category = found;
            break;
        }
    }

    if (!category) {
        return interaction.reply({
            embeds: [errorEmbed('Category Not Found', 'Selected ticket category could not be resolved.')],
            ephemeral: true
        });
    }

    // 3. Check active ticket limit per user
    const openTicketsCount = await Ticket.countDocuments({
        guildId,
        userId,
        status: 'OPEN'
    });

    const maxAllowed = guildConfig.maxTicketsPerUser || 3;
    if (openTicketsCount >= maxAllowed) {
        return interaction.reply({
            embeds: [errorEmbed('Limit Reached', `You already have **${openTicketsCount}** open ticket(s). The maximum allowed is **${maxAllowed}**. Please resolve existing tickets before opening a new one.`)],
            ephemeral: true
        });
    }

    // 4. Construct Multi-step Modal Form for intake details
    const modal = new ModalBuilder()
        .setCustomId(`ticket_modal:${categoryId}`)
        .setTitle(`New Ticket - ${category.label.substring(0, 30)}`);

    // Standard subject field
    const subjectInput = new TextInputBuilder()
        .setCustomId('ticket_subject')
        .setLabel('Subject / Summary')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Brief summary of your issue or request')
        .setRequired(true)
        .setMaxLength(100);

    // Standard description field
    const descriptionInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Detailed Explanation')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe your issue, steps to reproduce, or requirements in detail...')
        .setRequired(true)
        .setMaxLength(1000);

    const firstRow = new ActionRowBuilder().addComponents(subjectInput);
    const secondRow = new ActionRowBuilder().addComponents(descriptionInput);

    modal.addComponents(firstRow, secondRow);

    // Add custom fields if configured for category
    if (category.customFields && category.customFields.length > 0) {
        category.customFields.forEach((field, idx) => {
            if (idx >= 3) return; // Discord modal max 5 fields limit (2 standard + 3 custom)
            const customInput = new TextInputBuilder()
                .setCustomId(`custom_${field.customId}`)
                .setLabel(field.label)
                .setStyle(field.style === 'Paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setPlaceholder(field.placeholder || '')
                .setRequired(field.required ?? true);
            modal.addComponents(new ActionRowBuilder().addComponents(customInput));
        });
    }

    await interaction.showModal(modal);
}

module.exports = {
    handlePanelSelection
};
