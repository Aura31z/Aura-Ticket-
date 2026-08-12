const { REST, Routes, ActivityType } = require('discord.js');
const config = require('../config');
const { initStaleChecker } = require('../utils/staleChecker');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`🤖 Logged in as ${client.user.tag} (${client.user.id})`);

        // Set Bot Activity
        client.user.setActivity('Support Tickets | /setup-panel', { type: ActivityType.Watching });

        // Register Slash Commands
        const commandsData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
        const rest = new REST({ version: '10' }).setToken(config.token);

        try {
            console.log(`🔄 Registering ${commandsData.length} application slash commands...`);
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandsData }
            );
            console.log('✅ Global slash commands registered successfully.');
        } catch (error) {
            console.error('❌ Failed to register slash commands:', error);
        }

        // Initialize Stale Ticket Background Worker
        initStaleChecker(client);
    }
};
