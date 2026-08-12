const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Creates standard sleek embeds with consistent design
 */
function createEmbed({ title, description, color = config.colors.dark, fields = [], footer = null, author = null, thumbnail = null }) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTimestamp();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (fields && fields.length > 0) embed.addFields(fields);
    if (thumbnail) embed.setThumbnail(thumbnail);

    if (author) {
        embed.setAuthor({
            name: author.name,
            iconURL: author.iconURL || null
        });
    }

    if (footer) {
        embed.setFooter(typeof footer === 'string' ? { text: footer } : footer);
    } else {
        embed.setFooter({ text: 'Ticket Management System' });
    }

    return embed;
}

function successEmbed(title, description) {
    return createEmbed({
        title: `${config.emojis.success} ${title}`,
        description,
        color: config.colors.success
    });
}

function errorEmbed(title, description) {
    return createEmbed({
        title: `${config.emojis.warning} ${title}`,
        description,
        color: config.colors.danger
    });
}

function infoEmbed(title, description) {
    return createEmbed({
        title: `${config.emojis.info} ${title}`,
        description,
        color: config.colors.primary
    });
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    infoEmbed
};
