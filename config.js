require('dotenv').config();

module.exports = {
    // Discord Bot Credentials
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    mongoUri: process.env.MONGODB_URI,

    // Sleek Modern Palette (#2B2D31, #5865F2, #ED4245, #57F287, #FEE75C)
    colors: {
        dark: 0x2B2D31,      // Main sleek background embed color
        primary: 0x5865F2,   // Blurple primary highlight
        success: 0x57F287,   // Green success indicator
        danger: 0xED4245,    // Red danger/close color
        warning: 0xFEE75C,   // Yellow alert color
        info: 0x001020       // Deep info tint
    },

    // Custom Emojis for Control Bar & Buttons
    emojis: {
        ticket: '🎫',
        close: '🔒',
        reopen: '🔓',
        claim: '📌',
        unclaim: '📍',
        transcript: '📜',
        addMember: '➕',
        removeMember: '➖',
        pingUser: '🔔',
        delete: '🗑️',
        warning: '⚠️',
        success: '✅',
        info: 'ℹ️',
        staff: '🛡️',
        user: '👤'
    },

    // Default Ticket Limits & Stale Checker Settings
    defaults: {
        maxTicketsPerUser: 3,
        staleCheckIntervalMinutes: 30, // How often background worker checks inactive tickets
        staleInactivityHours: 24        // Hours without message before flagging ticket as stale
    }
};
