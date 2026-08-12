const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../database/models/GuildConfig');
const Ticket = require('../database/models/Ticket');
const { createEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const config = require('../config');

/**
 * Handle intake modal submission
 * @param {import('discord.js').ModalSubmitInteraction} interaction 
 */
async function handleModalSubmission(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const guildId = guild.id;
    const user = interaction.user;

    // Custom ID: ticket_modal:categoryId
    const categoryId = interaction.customId.split(':')[1];

    // Fetch guild config
    const guildConfig = await GuildConfig.findOne({ guildId });
    if (!guildConfig) {
        return interaction.editReply({
            embeds: [errorEmbed('Configuration Error', 'Guild ticket settings missing.')]
        });
    }

    // Locate category object
    let category = null;
    for (const panel of guildConfig.panels) {
        const found = panel.categories.find(c => c.id === categoryId);
        if (found) {
            category = found;
            break;
        }
    }

    if (!category) {
        return interaction.editReply({
            embeds: [errorEmbed('Error', 'Category definition not found.')]
        });
    }

    // Increment ticket counter atomically
    guildConfig.ticketCounter += 1;
    await guildConfig.save();

    const counterFormatted = String(guildConfig.ticketCounter).padStart(4, '0');
    const ticketIdStr = counterFormatted;

    // Format dynamic channel name
    let channelName = `ticket-${counterFormatted}`;
    if (category.namingFormat) {
        channelName = category.namingFormat
            .replace('{counter}', counterFormatted)
            .replace('{category}', category.id)
            .replace('{username}', user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }

    // Prepare permission overwrites
    const permissionOverwrites = [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        },
        {
            id: guild.members.me.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages
            ]
        }
    ];

    // Determine support role (category specific override or global server role)
    const supportRoleId = category.supportRoleId || guildConfig.supportRoleId;
    if (supportRoleId && guild.roles.cache.has(supportRoleId)) {
        permissionOverwrites.push({
            id: supportRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        });
    }

    // Add Admin Role if defined
    if (guildConfig.adminRoleId && guild.roles.cache.has(guildConfig.adminRoleId)) {
        permissionOverwrites.push({
            id: guildConfig.adminRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels
            ]
        });
    }

    // Extract modal input fields
    const subject = interaction.fields.getTextInputValue('ticket_subject') || 'General Support';
    const description = interaction.fields.getTextInputValue('ticket_description') || 'No description provided';

    const answersList = [
        { question: 'Subject', answer: subject },
        { question: 'Description', answer: description }
    ];

    // Extract additional custom fields if present
    if (category.customFields) {
        category.customFields.forEach(field => {
            try {
                const val = interaction.fields.getTextInputValue(`custom_${field.customId}`);
                if (val) answersList.push({ question: field.label, answer: val });
            } catch (e) {
                // Field omitted or not submitted
            }
        });
    }

    let ticketChannel = null;
    try {
        ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.parentCategoryId || null,
            permissionOverwrites,
            topic: `Ticket #${ticketIdStr} | User: ${user.tag} (${user.id}) | Category: ${category.label}`
        });
    } catch (err) {
        console.error('Failed to create ticket channel:', err);
        return interaction.editReply({
            embeds: [errorEmbed('Channel Creation Failed', 'The bot lacked permissions to create a channel or category.')]
        });
    }

    // Save ticket record to MongoDB
    const ticketDoc = new Ticket({
        ticketNumber: guildConfig.ticketCounter,
        ticketId: ticketIdStr,
        guildId: guildId,
        channelId: ticketChannel.id,
        userId: user.id,
        categoryId: category.id,
        categoryLabel: category.label,
        subject: subject,
        answers: answersList,
        status: 'OPEN',
        lastActivityAt: new Date()
    });
    await ticketDoc.save();

    // Construct Welcome Embed with sleek design (#2B2D31 / #5865F2)
    const welcomeEmbed = createEmbed({
        title: `${category.emoji || '🎫'} ${category.label} - Ticket #${ticketIdStr}`,
        description: `Welcome <@${user.id}>! Support staff have been notified.\nUse the control bar buttons below to manage this ticket.`,
        color: config.colors.primary,
        author: {
            name: `${user.tag} (${user.id})`,
            iconURL: user.displayAvatarURL()
        },
        fields: answersList.map(a => ({
            name: `📌 ${a.question}`,
            value: a.answer.length > 1024 ? a.answer.substring(0, 1021) + '...' : a.answer,
            inline: false
        }))
    });

    // Control Bar Buttons (Row 1)
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close')
            .setEmoji(config.emojis.close)
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim')
            .setEmoji(config.emojis.claim)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('ticket_transcript')
            .setLabel('Transcript')
            .setEmoji(config.emojis.transcript)
            .setStyle(ButtonStyle.Secondary)
    );

    // Control Bar Buttons (Row 2)
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_add_member')
            .setLabel('Add Member')
            .setEmoji(config.emojis.addMember)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('ticket_remove_member')
            .setLabel('Remove Member')
            .setEmoji(config.emojis.removeMember)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('ticket_ping_user')
            .setLabel('Ping User')
            .setEmoji(config.emojis.pingUser)
            .setStyle(ButtonStyle.Primary)
    );

    const pingContent = supportRoleId ? `<@${user.id}> | <@&${supportRoleId}>` : `<@${user.id}>`;

    await ticketChannel.send({
        content: pingContent,
        embeds: [welcomeEmbed],
        components: [row1, row2]
    });

    // Ephemeral response to user
    await interaction.editReply({
        embeds: [successEmbed('Ticket Opened', `Your ticket has been created: <#${ticketChannel.id}>`)].concat([])
    });
}

module.exports = {
    handleModalSubmission
};
