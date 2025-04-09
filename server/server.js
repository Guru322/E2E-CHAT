const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const activeSessions = new Map();

function generateSessionKey(length = 8) {
  return crypto.randomBytes(length).toString('hex');
}

app.post('/api/create-session', (req, res) => {
  const sessionKey = generateSessionKey();
  activeSessions.set(sessionKey, { users: [], created: new Date() });
  
  res.json({ sessionKey });
});

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://chat.gurucharan.me",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('joinSession', ({ sessionKey, publicKey }) => {
    if (!activeSessions.has(sessionKey)) {
      socket.emit('error', { message: 'Invalid session key' });
      return;
    }
    
    const session = activeSessions.get(sessionKey);
    
    session.users.push({
      socketId: socket.id,
      publicKey
    });
    
    // Join socket room
    socket.join(sessionKey);
    
    if (session.users.length === 2) {
      const [user1, user2] = session.users;
      
      io.to(user1.socketId).emit('peerJoined', {
        peerPublicKey: user2.publicKey
      });
      
      io.to(user2.socketId).emit('peerJoined', {
        peerPublicKey: user1.publicKey
      });
    }
    
    socket.emit('sessionJoined', { message: 'Successfully joined session' });
    
    socket.to(sessionKey).emit('userJoined', { message: 'A new user has joined the chat' });
  });
  
  socket.on('sendMessage', ({ sessionKey, encryptedMessage, iv }) => {
    if (!activeSessions.has(sessionKey)) {
      socket.emit('error', { message: 'Invalid session key' });
      return;
    }
    
    socket.to(sessionKey).emit('receiveMessage', { 
      encryptedMessage,
      iv,
      sender: socket.id
    });
  });
  
  socket.on('destroySession', ({ sessionKey }) => {
    if (activeSessions.has(sessionKey)) {
      io.to(sessionKey).emit('sessionDestroyed', { message: 'This chat session has been destroyed' });
      
      activeSessions.delete(sessionKey);
    }
  });
  
  socket.on('checkSessionStatus', ({ sessionKey }) => {
    if (activeSessions.has(sessionKey)) {
      const session = activeSessions.get(sessionKey);
      

      socket.emit('sessionStatus', {
        hasExistingPeer: session.users.length > 0
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    for (const [sessionKey, session] of activeSessions.entries()) {
      const userIndex = session.users.findIndex(user => user.socketId === socket.id);
      
      if (userIndex !== -1) {
        session.users.splice(userIndex, 1);
        
        socket.to(sessionKey).emit('userLeft', { message: 'A user has left the chat' });
        
        if (session.users.length === 0) {
          activeSessions.delete(sessionKey);
        }
      }
    }
  });
});

setInterval(() => {
  const now = new Date();
  for (const [sessionKey, session] of activeSessions.entries()) {
    if ((now - session.created) > 24 * 60 * 60 * 1000) {
      io.to(sessionKey).emit('sessionExpired', { message: 'This chat session has expired' });
      activeSessions.delete(sessionKey);
    }
  }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
