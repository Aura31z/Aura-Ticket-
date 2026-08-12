const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    id: { type: String, required: true },           // e.g. "billing", "general"
    label: { type: String, required: true },        // e.g. "Billing Support"
    description: { type: String, default: '' },
    emoji: { type: String, default: '🎫' },
    parentCategoryId: { type: String, default: null }, // Discord Category Channel ID
    supportRoleId: { type: String, default: null }, // Override support role for category
    namingFormat: { type: String, default: 'ticket-{counter}' }, // 'ticket-{counter}' or '{category}-{username}'
    customFields: [
        {
            customId: { type: String, required: true },
            label: { type: String, required: true },
            style: { type: String, default: 'Short' }, // 'Short' or 'Paragraph'
            placeholder: { type: String, default: '' },
            required: { type: Boolean, default: true }
        }
    ]
});

const PanelSchema = new mongoose.Schema({
    panelId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    title: { type: String, default: 'Support Ticket System' },
    description: { type: String, default: 'Select a category below to create a support ticket.' },
    displayMode: { type: String, enum: ['SELECT_MENU', 'BUTTONS'], default: 'SELECT_MENU' },
    categories: [CategorySchema]
});

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    logChannelId: { type: String, default: null },
    supportRoleId: { type: String, default: null },
    adminRoleId: { type: String, default: null },
    ticketCounter: { type: Number, default: 0 },
    maxTicketsPerUser: { type: Number, default: 3 },
    staleHours: { type: Number, default: 24 }, // Inactivity hours before flagged
    panels: [PanelSchema]
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
