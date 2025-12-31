const express = require('express'); 
const router = express.Router();
const { createChat, createGroupChat, findUserChat, findChat } = require('../controllers/chatController');

router.post('/', createChat);
router.post('/group', createGroupChat);
router.get('/find/:firstId/:secondId', findChat);
router.get('/:userId', findUserChat);


module.exports = router;
