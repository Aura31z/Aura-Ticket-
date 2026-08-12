const discordTranscripts = require('discord-html-transcripts');

/**
 * Generate an HTML transcript file for a given ticket channel
 * @param {import('discord.js').TextChannel} channel 
 * @param {import('discord.js').Guild} guild 
 * @returns {Promise<import('discord.js').AttachmentBuilder>}
 */
async function generateTranscript(channel, guild) {
    try {
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1, // Fetch all messages
            returnType: 'attachment',
            fileName: `transcript-${channel.name}.html`,
            minify: true,
            saveImages: true,
            poweredBy: false
        });
        return attachment;
    } catch (error) {
        console.error(`Error generating transcript for ${channel.name}:`, error);
        throw error;
    }
}

module.exports = {
    generateTranscript
};
