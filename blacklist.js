const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Blacklist = require('../database/models/Blacklist');
const { createEmbed, successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage user blacklists for the ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Blacklist a user from opening tickets')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('The user to blacklist')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('reason')
                        .setDescription('Reason for blacklisting')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a user from the ticket blacklist')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('The user to un-blacklist')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all blacklisted users in this server')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            try {
                await Blacklist.create({
                    guildId,
                    userId: targetUser.id,
                    reason,
                    addedBy: interaction.user.id
                });

                return interaction.reply({
                    embeds: [successEmbed('User Blacklisted', `<@${targetUser.id}> has been blacklisted from creating tickets.\n**Reason:** ${reason}`)],
                    ephemeral: true
                });
            } catch (err) {
                if (err.code === 11000) {
                    return interaction.reply({
                        embeds: [errorEmbed('Already Blacklisted', `<@${targetUser.id}> is already blacklisted on this server.`)],
                        ephemeral: true
                    });
                }
                return interaction.reply({
                    embeds: [errorEmbed('Database Error', 'Could not add user to blacklist.')],
                    ephemeral: true
                });
            }
        }

        if (subcommand === 'remove') {
            const targetUser = interaction.options.getUser('user');

            const deleted = await Blacklist.findOneAndDelete({ guildId, userId: targetUser.id });
            if (!deleted) {
                return interaction.reply({
                    embeds: [errorEmbed('Not Found', `<@${targetUser.id}> is not blacklisted.`)],
                    ephemeral: true
                });
            }

            return interaction.reply({
                embeds: [successEmbed('User Un-blacklisted', `<@${targetUser.id}> can now create tickets again.`)],
                ephemeral: true
            });
        }

        if (subcommand === 'list') {
            const blacklistedUsers = await Blacklist.find({ guildId });

            if (!blacklistedUsers || blacklistedUsers.length === 0) {
                return interaction.reply({
                    embeds: [infoEmbed('Blacklist Empty', 'There are currently no blacklisted users in this server.')],
                    ephemeral: true
                });
            }

            const listEmbed = createEmbed({
                title: '🚫 Ticket Blacklisted Users',
                description: blacklistedUsers.map((b, idx) => `${idx + 1}. <@${b.userId}> (${b.userId})\n↳ **Reason:** ${b.reason}`).join('\n\n')
            });

            return interaction.reply({
                embeds: [listEmbed],
                ephemeral: true
            });
        }
    }
};
