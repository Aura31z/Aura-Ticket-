const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleCloseTicket, handleClaimTicket } = require('../handlers/ticketControls');
const { generateTranscript } = require('../utils/transcript');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket management commands')
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Close the current ticket channel')
                .addStringOption(opt =>
                    opt.setName('reason')
                        .setDescription('Reason for closing this ticket')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('claim')
                .setDescription('Claim this ticket channel as assigned support staff'))
        .addSubcommand(sub =>
            sub.setName('unclaim')
                .setDescription('Unclaim this ticket channel'))
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a user to this ticket channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to add')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a user from this ticket channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to remove')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('transcript')
                .setDescription('Generate and download an HTML transcript for this ticket channel')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'close') {
            const reason = interaction.options.getString('reason') || 'Closed via /ticket close command';
            return handleCloseTicket(interaction, reason);
        }

        if (subcommand === 'claim') {
            return handleClaimTicket(interaction, true);
        }

        if (subcommand === 'unclaim') {
            return handleClaimTicket(interaction, false);
        }

        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user');
            await interaction.channel.permissionOverwrites.edit(targetUser.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            return interaction.reply({
                embeds: [successEmbed('User Added', `<@${targetUser.id}> has been granted access to this ticket.`)]
            });
        }

        if (subcommand === 'remove') {
            const targetUser = interaction.options.getUser('user');
            await interaction.channel.permissionOverwrites.delete(targetUser.id);
            return interaction.reply({
                embeds: [infoEmbed('User Removed', `<@${targetUser.id}> access has been removed from this ticket.`)]
            });
        }

        if (subcommand === 'transcript') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const attachment = await generateTranscript(interaction.channel, interaction.guild);
                return interaction.editReply({
                    content: '📜 Here is your HTML transcript:',
                    files: [attachment]
                });
            } catch (err) {
                return interaction.editReply({
                    embeds: [errorEmbed('Transcript Error', 'Failed to generate transcript.')]
                });
            }
        }
    }
};
