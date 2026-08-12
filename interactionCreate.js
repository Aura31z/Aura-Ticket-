const { handlePanelSelection } = require('../handlers/panelHandler');
const { handleModalSubmission } = require('../handlers/modalHandler');
const { handleTicketButton } = require('../handlers/ticketControls');
const Ticket = require('../database/models/Ticket');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Track/update ticket activity timestamp if interaction is inside a ticket channel
        if (interaction.channelId) {
            Ticket.updateOne({ channelId: interaction.channelId, status: 'OPEN' }, { lastActivityAt: new Date() }).exec().catch(() => {});
        }

        // 1. Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing command /${interaction.commandName}:`, error);
                const replyPayload = {
                    embeds: [errorEmbed('Command Error', 'An unexpected error occurred while executing this command.')],
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(replyPayload).catch(() => {});
                } else {
                    await interaction.reply(replyPayload).catch(() => {});
                }
            }
            return;
        }

        // 2. Handle Panel Dropdown / Button selection
        if ((interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_select')) ||
            (interaction.isButton() && interaction.customId.startsWith('ticket_select'))) {
            return handlePanelSelection(interaction);
        }

        // 3. Handle Intake Modal Form Submissions
        if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal')) {
            return handleModalSubmission(interaction);
        }

        // 4. Handle Staff Control Bar Buttons
        if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
            return handleTicketButton(interaction);
        }
    }
};
