const { Server } = require('socket.io');
require('dotenv').config({ path: '../.env' });

const PORT = process.env.SOCKET_PORT || 8900;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',');

const io = new Server(PORT, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  }
});

const onlineUsers = new Map(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  // Register user and join personal room
  socket.on('setup', (userId) => {
    if (!userId) return;
    socket.userId = userId;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    socket.join(userId);
  });

  // Join a chat room
  socket.on('joinChat', (chatId) => {
    if (!chatId) return;
    socket.join(chatId);
  });

  // Forward a message to chat room and to recipient user rooms
  socket.on('message:send', (payload = {}) => {
    const { chatId, message, recipients = [], chat } = payload;
    if (!chatId || !message) return;

    // Emit to everyone in the chat room
    io.to(chatId).emit('message:receive', { chatId, message, chat });

    // Also emit directly to recipient user rooms (covers users not currently in room)
    recipients.forEach((uid) => io.to(uid).emit('message:receive', { chatId, message, chat }));
  });

  // Broadcast new group creation to member user rooms
  socket.on('group:created', (chat = {}) => {
    if (!Array.isArray(chat.members)) return;
    chat.members.forEach((uid) => io.to(uid).emit('group:created', chat));
  });

  socket.on('disconnect', () => {
    const uid = socket.userId;
    if (uid && onlineUsers.has(uid)) {
      onlineUsers.get(uid).delete(socket.id);
      if (onlineUsers.get(uid).size === 0) {
        onlineUsers.delete(uid);
      }
    }
  });
});

console.log(`Socket.io server listening on ${PORT}`);
