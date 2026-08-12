const Ticket = require('../database/models/Ticket');
const GuildConfig = require('../database/models/GuildConfig');
const { createEmbed } = require('./embeds');
const config = require('../config');

/**
 * Periodically checks for inactive open tickets and warns or closes them.
 * @param {import('discord.js').Client} client 
 */
function initStaleChecker(client) {
    const intervalMs = config.defaults.staleCheckIntervalMinutes * 60 * 1000;

    setInterval(async () => {
        try {
            const openTickets = await Ticket.find({ status: 'OPEN' });

            for (const ticket of openTickets) {
                const guildConfig = await GuildConfig.findOne({ guildId: ticket.guildId });
                const staleHours = guildConfig?.staleHours || config.defaults.staleInactivityHours;
                const staleThresholdMs = staleHours * 60 * 60 * 1000;
                const now = Date.now();
                const inactiveDurationMs = now - new Date(ticket.lastActivityAt).getTime();

                if (inactiveDurationMs > staleThresholdMs) {
                    const guild = client.guilds.cache.get(ticket.guildId);
                    if (!guild) continue;

                    const channel = guild.channels.cache.get(ticket.channelId);
                    if (!channel) continue;

                    if (!ticket.staleWarned) {
                        // Send warning message to the ticket channel
                        const warnEmbed = createEmbed({
                            title: `${config.emojis.warning} Inactive Ticket Warning`,
                            description: `This ticket has been inactive for **${staleHours} hours**.\n\nPlease reply if you still need assistance, otherwise this ticket may be automatically closed.`,
                            color: config.colors.warning
                        });

                        await channel.send({ content: `<@${ticket.userId}>`, embeds: [warnEmbed] }).catch(() => {});
                        ticket.staleWarned = true;
                        await ticket.save();
                    }
                }
            }
        } catch (error) {
            console.error('Error running stale ticket background check:', error);
        }
    }, intervalMs);

    console.log(`⏱️ Stale ticket checker initialized (Interval: ${config.defaults.staleCheckIntervalMinutes} mins).`);
}

module.exports = {
    initStaleChecker
};
