const mongoose = require('mongoose');

const ModalAnswerSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
}, { _id: false });

const TicketSchema = new mongoose.Schema({
    ticketNumber: { type: Number, required: true },
    ticketId: { type: String, required: true }, // Formatted e.g. "0001"
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    userId: { type: String, required: true },
    categoryId: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    claimedBy: { type: String, default: null }, // User ID of claiming staff
    status: { 
        type: String, 
        enum: ['OPEN', 'CLOSED'], 
        default: 'OPEN' 
    },
    subject: { type: String, default: 'General Support' },
    answers: [ModalAnswerSchema],
    transcriptUrl: { type: String, default: null },
    closedBy: { type: String, default: null },
    closeReason: { type: String, default: 'No reason provided' },
    lastActivityAt: { type: Date, default: Date.now },
    staleWarned: { type: Boolean, default: false },
    closedAt: { type: Date, default: null }
}, { timestamps: true });

// Compound index for querying user tickets quickly per guild
TicketSchema.index({ guildId: 1, userId: 1, status: 1 });
TicketSchema.index({ channelId: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);
