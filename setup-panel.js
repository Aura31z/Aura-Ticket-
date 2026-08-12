const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../database/models/GuildConfig');
const { createEmbed, successEmbed, errorEmbed } = require('../utils/embeds');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-panel')
        .setDescription('Configure and deploy an interactive Ticket Panel for the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Target text channel where the ticket panel will be sent')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(opt =>
            opt.setName('support_role')
                .setDescription('Default support staff role for tickets')
                .setRequired(true))
        .addChannelOption(opt =>
            opt.setName('log_channel')
                .setDescription('Channel to send closed ticket transcripts and logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('title')
                .setDescription('Custom title for the ticket panel embed')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('display_mode')
                .setDescription('Interactive style: Select Dropdown Menu or Buttons')
                .addChoices(
                    { name: 'Dropdown Select Menu', value: 'SELECT_MENU' },
                    { name: 'Buttons', value: 'BUTTONS' }
                )
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetChannel = interaction.options.getChannel('channel');
        const supportRole = interaction.options.getRole('support_role');
        const logChannel = interaction.options.getChannel('log_channel');
        const customTitle = interaction.options.getString('title') || 'Support Ticket System';
        const displayMode = interaction.options.getString('display_mode') || 'SELECT_MENU';

        const guildId = interaction.guildId;

        // Default ticket categories setup for high utility
        const defaultCategories = [
            {
                id: 'general',
                label: 'General Support',
                description: 'Get help with general questions and server assistance',
                emoji: '❓',
                namingFormat: 'ticket-{counter}',
                customFields: [
                    { customId: 'account_name', label: 'Account / Username', style: 'Short', required: true }
                ]
            },
            {
                id: 'billing',
                label: 'Billing & Purchases',
                description: 'Assistance with payments, store purchases, and subscriptions',
                emoji: '💳',
                namingFormat: 'billing-{counter}',
                customFields: [
                    { customId: 'transaction_id', label: 'Transaction / Order ID', style: 'Short', required: true }
                ]
            },
            {
                id: 'bug_report',
                label: 'Bug Reports',
                description: 'Report technical bugs, glitches, or unexpected issues',
                emoji: '🐛',
                namingFormat: 'bug-{counter}',
                customFields: [
                    { customId: 'reproduce_steps', label: 'Steps to Reproduce', style: 'Paragraph', required: true }
                ]
            },
            {
                id: 'staff_app',
                label: 'Staff Applications',
                description: 'Apply for moderator, helper, or support team positions',
                emoji: '🛡️',
                namingFormat: 'staff-{username}',
                customFields: [
                    { customId: 'experience', label: 'Previous Staff Experience', style: 'Paragraph', required: true }
                ]
            }
        ];

        // Construct Panel Embed
        const panelEmbed = createEmbed({
            title: `${config.emojis.ticket} ${customTitle}`,
            description: `Need assistance? Select a topic below to open a ticket channel with our support team.\n\n` +
                defaultCategories.map(cat => `${cat.emoji} **${cat.label}**\n↳ *${cat.description}*`).join('\n\n'),
            color: config.colors.primary,
            footer: 'Select a category to start • Support Ticket System'
        });

        // Construct Components based on display_mode
        let components = [];
        const panelId = `panel_${Date.now()}`;

        if (displayMode === 'SELECT_MENU') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`ticket_select:${panelId}`)
                .setPlaceholder('Choose a ticket category...')
                .addOptions(
                    defaultCategories.map(cat => ({
                        label: cat.label,
                        description: cat.description.substring(0, 100),
                        value: cat.id,
                        emoji: cat.emoji
                    }))
                );
            components.push(new ActionRowBuilder().addComponents(selectMenu));
        } else {
            const buttonsRow = new ActionRowBuilder();
            defaultCategories.forEach(cat => {
                buttonsRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_select:${panelId}:${cat.id}`)
                        .setLabel(cat.label)
                        .setEmoji(cat.emoji)
                        .setStyle(ButtonStyle.Primary)
                );
            });
            components.push(buttonsRow);
        }

        // Send panel message into channel
        let sentMessage = null;
        try {
            sentMessage = await targetChannel.send({
                embeds: [panelEmbed],
                components
            });
        } catch (err) {
            console.error('Failed to send panel embed:', err);
            return interaction.editReply({
                embeds: [errorEmbed('Failed to Deploy Panel', `Could not send message to <#${targetChannel.id}>. Check channel view and send permissions.`)]
            });
        }

        // Save or Update Guild Config in MongoDB
        let guildConfig = await GuildConfig.findOne({ guildId });
        if (!guildConfig) {
            guildConfig = new GuildConfig({
                guildId,
                supportRoleId: supportRole.id,
                logChannelId: logChannel?.id || null,
                panels: []
            });
        } else {
            if (supportRole) guildConfig.supportRoleId = supportRole.id;
            if (logChannel) guildConfig.logChannelId = logChannel.id;
        }

        guildConfig.panels.push({
            panelId,
            channelId: targetChannel.id,
            messageId: sentMessage.id,
            title: customTitle,
            displayMode,
            categories: defaultCategories
        });

        await guildConfig.save();

        await interaction.editReply({
            embeds: [successEmbed('Ticket Panel Deployed', `Successfully sent panel to <#${targetChannel.id}>.\n` +
                `• **Support Role:** <@&${supportRole.id}>\n` +
                `• **Log Channel:** ${logChannel ? `<#${logChannel.id}>` : 'Not set'}\n` +
                `• **Display Mode:** \`${displayMode}\``)]
        });
    }
};
