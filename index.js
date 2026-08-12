const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const connectDatabase = require('./database/connect');

// Initialize discord.js Client with required Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Attach Collection for slash commands
client.commands = new Collection();

/**
 * Load Slash Commands from src/commands/
 */
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`🔹 Loaded command: /${command.data.name}`);
        } else {
            console.warn(`⚠️ The command at ${filePath} is missing required "data" or "execute" property.`);
        }
    }
}

/**
 * Load Events from src/events/
 */
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`⚡ Loaded event listener: ${event.name}`);
    }
}

/**
 * Main Application Startup Procedure
 */
async function startBot() {
    // 1. Connect to MongoDB Database
    await connectDatabase();

    // 2. Login to Discord Gateway
    if (!config.token) {
        console.error('❌ DISCORD_TOKEN is missing from environment variables (.env)');
        process.exit(1);
    }

    await client.login(config.token);
}

startBot().catch(err => {
    console.error('❌ Fatal error during bot startup:', err);
});
