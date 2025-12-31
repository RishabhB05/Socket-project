const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    members: { type: [String], required: true },
    isGroup: { type: Boolean, default: false },
    name: { type: String, default: "" }
}, {
    timestamps: true
});

const chatModel = mongoose.model('Chat', chatSchema);   
module.exports = chatModel;