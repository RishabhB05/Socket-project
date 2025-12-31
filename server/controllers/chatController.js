const chatModel = require('../models/chatModel');

const createChat = async (req, res) => {
    const{ firstId, secondId } = req.body;
    try{
        const chat = await chatModel.findOne({
            members: { $all: [firstId, secondId] },
            isGroup: false
        });
        if (chat) {
            return res.status(200).json(chat);
        }
        const newChat = new chatModel({
            members: [firstId, secondId],
            isGroup: false
        });
       const response = await newChat.save();
        res.status(201).json(response);
    }catch(err){
        console.error("Error in createChat:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create group chat
const createGroupChat = async (req, res) => {
    const { memberIds = [], name = "" } = req.body;

    try {
        const uniqueMembers = Array.from(new Set(memberIds.filter(Boolean)));
        if (uniqueMembers.length < 2) {
            return res.status(400).json({ message: 'Provide at least 2 members for a group' });
        }

        const newChat = new chatModel({
            members: uniqueMembers,
            isGroup: true,
            name
        });

        const response = await newChat.save();
        return res.status(201).json(response);
    } catch (err) {
        console.error("Error in createGroupChat:", err);
        return res.status(500).json({ message: 'Server error' });
    }
};



const findUserChat = async (req, res) => {
    const userId = req.params.userId;

    try {
        const chats = await chatModel.find({
            members: { $in: [userId] }
        });
        res.status(200).json(chats);
    } catch (err) {
        console.error("Error in findUserChat:", err);
        res.status(500).json({ message: 'Server error' });
    }

};


const findChat = async (req, res) => {
    const { firstId, secondId } = req.params;
    try {
        const chat = await chatModel.findOne({
            members: { $all: [firstId, secondId] },
            isGroup: false
        });
        res.status(200).json(chat);
    } catch (err) {
        console.error("Error in findChat:", err);
        res.status(500).json({ message: 'Server error' });
    }   
};


module.exports = { createChat, createGroupChat, findUserChat, findChat };