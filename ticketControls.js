const { PermissionFlagsBits, ActionRowBuilder, UserSelectMenuBuilder, ComponentType } = require('discord.js');
const Ticket = require('../database/models/Ticket');
const GuildConfig = require('../database/models/GuildConfig');
const { generateTranscript } = require('../utils/transcript');
const { createEmbed, successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');
const config = require('../config');

/**
 * Main router for control bar buttons
 * @param {import('discord.js').ButtonInteraction} interaction 
 */
async function handleTicketButton(interaction) {
    const customId = interaction.customId;

    switch (customId) {
        case 'ticket_close':
            await handleCloseTicket(interaction);
            break;
        case 'ticket_claim':
            await handleClaimTicket(interaction, true);
            break;
        case 'ticket_unclaim':
            await handleClaimTicket(interaction, false);
            break;
        case 'ticket_transcript':
            await handleGenerateTranscript(interaction);
            break;
        case 'ticket_add_member':
            await handleAddMemberPrompt(interaction);
            break;
        case 'ticket_remove_member':
            await handleRemoveMemberPrompt(interaction);
            break;
        case 'ticket_ping_user':
            await handlePingUser(interaction);
            break;
        default:
            break;
    }
}

/**
 * Handle Ticket Close
 */
async function handleCloseTicket(interaction, customReason = 'Closed by staff/user') {
    const channel = interaction.channel;
    const guild = interaction.guild;

    const ticket = await Ticket.findOne({ channelId: channel.id, status: 'OPEN' });
    if (!ticket) {
        return interaction.reply({
            embeds: [errorEmbed('Error', 'This channel is not an active ticket or has already been closed.')],
            ephemeral: true
        });
    }

    await interaction.reply({
        embeds: [infoEmbed('Closing Ticket', 'Generating transcript and archiving channel in **5 seconds**...')]
    });

    // 1. Update ticket record in DB
    ticket.status = 'CLOSED';
    ticket.closedBy = interaction.user.id;
    ticket.closeReason = customReason;
    ticket.closedAt = new Date();
    await ticket.save();

    // 2. Fetch Guild Config for Log Channel & Staff Roles
    const guildConfig = await GuildConfig.findOne({ guildId: guild.id });

    // 3. Generate HTML Transcript
    let transcriptFile = null;
    try {
        transcriptFile = await generateTranscript(channel, guild);
    } catch (err) {
        console.error('Failed to generate transcript:', err);
    }

    // 4. Send Transcript to Ticket Creator via DM
    const ticketCreator = await guild.client.users.fetch(ticket.userId).catch(() => null);
    if (ticketCreator) {
        const dmEmbed = createEmbed({
            title: `${config.emojis.ticket} Ticket Transcript - #${ticket.ticketId}`,
            description: `Your ticket in **${guild.name}** has been closed.`,
            color: config.colors.dark,
            fields: [
                { name: 'Category', value: ticket.categoryLabel, inline: true },
                { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Reason', value: customReason, inline: false }
            ]
        });

        if (transcriptFile) {
            await ticketCreator.send({ embeds: [dmEmbed], files: [transcriptFile] }).catch(() => {
                console.log(`Could not send transcript DM to user ${ticket.userId}`);
            });
        } else {
            await ticketCreator.send({ embeds: [dmEmbed] }).catch(() => {});
        }
    }

    // 5. Send Log to Centralized Log Channel
    if (guildConfig && guildConfig.logChannelId) {
        const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
        if (logChannel) {
            const logEmbed = createEmbed({
                title: `📜 Ticket Closed - #${ticket.ticketId}`,
                color: config.colors.danger,
                fields: [
                    { name: 'Ticket Creator', value: `<@${ticket.userId}> (${ticket.userId})`, inline: true },
                    { name: 'Closed By', value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: true },
                    { name: 'Claimed By', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Unclaimed', inline: true },
                    { name: 'Category', value: ticket.categoryLabel, inline: true },
                    { name: 'Subject', value: ticket.subject, inline: true },
                    { name: 'Opened At', value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:F>`, inline: false },
                    { name: 'Closed At', value: `<t:${Math.floor(new Date(ticket.closedAt).getTime() / 1000)}:F>`, inline: false }
                ]
            });

            const logPayload = { embeds: [logEmbed] };
            if (transcriptFile) logPayload.files = [transcriptFile];

            await logChannel.send(logPayload).catch(err => console.error('Log channel send error:', err));
        }
    }

    // 6. Delete channel after 5 seconds
    setTimeout(async () => {
        await channel.delete('Ticket closed').catch(() => {});
    }, 5000);
}

/**
 * Handle Claim / Unclaim Ticket
 */
async function handleClaimTicket(interaction, claim = true) {
    const channel = interaction.channel;
    const user = interaction.user;

    const ticket = await Ticket.findOne({ channelId: channel.id, status: 'OPEN' });
    if (!ticket) {
        return interaction.reply({
            embeds: [errorEmbed('Error', 'Active ticket not found.')],
            ephemeral: true
        });
    }

    if (claim) {
        if (ticket.claimedBy) {
            return interaction.reply({
                embeds: [errorEmbed('Already Claimed', `This ticket is already claimed by <@${ticket.claimedBy}>.`)],
                ephemeral: true
            });
        }

        ticket.claimedBy = user.id;
        await ticket.save();

        // Update channel name or permissions
        await channel.permissionOverwrites.edit(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ManageMessages: true
        }).catch(() => {});

        const claimEmbed = successEmbed(
            'Ticket Claimed',
            `<@${user.id}> has claimed this ticket and will be assisting you.`
        );

        await interaction.reply({ embeds: [claimEmbed] });
    } else {
        if (ticket.claimedBy !== user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'Only the staff member who claimed this ticket or an administrator can unclaim it.')],
                ephemeral: true
            });
        }

        ticket.claimedBy = null;
        await ticket.save();

        const unclaimEmbed = infoEmbed(
            'Ticket Unclaimed',
            `This ticket has been unclaimed by <@${user.id}> and is now open for any support staff.`
        );

        await interaction.reply({ embeds: [unclaimEmbed] });
    }
}

/**
 * Generate transcript on demand
 */
async function handleGenerateTranscript(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const transcriptFile = await generateTranscript(interaction.channel, interaction.guild);
        await interaction.editReply({
            content: '📜 Here is the generated transcript for this ticket:',
            files: [transcriptFile]
        });
    } catch (err) {
        await interaction.editReply({
            embeds: [errorEmbed('Transcript Error', 'Could not generate HTML transcript.')]
        });
    }
}

/**
 * Prompt User Select Menu for Add Member
 */
async function handleAddMemberPrompt(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('select_add_member')
            .setPlaceholder('Select a member to add to this ticket...')
            .setMinValues(1)
            .setMaxValues(1)
    );

    const reply = await interaction.reply({
        content: 'Select a user to add to this ticket channel:',
        components: [row],
        ephemeral: true
    });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.UserSelect,
        time: 30000
    });

    collector.on('collect', async i => {
        const targetUser = i.users.first();
        await interaction.channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        await i.reply({
            embeds: [successEmbed('Member Added', `<@${targetUser.id}> has been granted access to this ticket.`)].concat([])
        });
    });
}

/**
 * Prompt User Select Menu for Remove Member
 */
async function handleRemoveMemberPrompt(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('select_remove_member')
            .setPlaceholder('Select a member to remove from this ticket...')
            .setMinValues(1)
            .setMaxValues(1)
    );

    const reply = await interaction.reply({
        content: 'Select a user to remove from this ticket channel:',
        components: [row],
        ephemeral: true
    });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.UserSelect,
        time: 30000
    });

    collector.on('collect', async i => {
        const targetUser = i.users.first();
        await interaction.channel.permissionOverwrites.delete(targetUser.id);

        await i.reply({
            embeds: [infoEmbed('Member Removed', `<@${targetUser.id}> access has been revoked from this ticket.`)].concat([])
        });
    });
}

/**
 * Ping Ticket Creator
 */
async function handlePingUser(interaction) {
    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'OPEN' });
    if (!ticket) {
        return interaction.reply({
            embeds: [errorEmbed('Error', 'Active ticket document not found.')],
            ephemeral: true
        });
    }

    await interaction.reply({
        content: `<@${ticket.userId}> - Support staff are waiting for your response!`,
        allowedMentions: { users: [ticket.userId] }
    });
}

module.exports = {
    handleTicketButton,
    handleCloseTicket,
    handleClaimTicket
};
