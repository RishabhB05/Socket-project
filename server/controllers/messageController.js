const messageModel = require('../models/messageModel');

const createMessage = async (req, res) => {
    const { chatId, senderId, text } = req.body;
    
       const message = new messageModel({
        chatId,
        senderId,
        text
    });

    try{
        const response  = await message.save();
        res.status(201).json(response);

    }catch(err){
        console.error("Error in createMessage:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

//get messages for a chat can be added here
const getMessages = async (req, res) => {
    const chatId = req.params.chatId;
    try {
        const messages = await messageModel
            .find({ chatId })
            .sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (err) {
        console.error("Error in getMessages:", err);
        res.status(500).json({ message: 'Server error' });
    }
};



module.exports = { createMessage, getMessages };