const mongoose = require('mongoose');

const BlacklistSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    reason: { type: String, default: 'Violating ticket system rules' },
    addedBy: { type: String, required: true }
}, { timestamps: true });

BlacklistSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Blacklist', BlacklistSchema);
