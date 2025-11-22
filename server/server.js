import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Explicit transports
  allowEIO3: true
});

// Store active users: { userId: socketId }
const activeUsers = new Map();
// Store socket to user mapping: { socketId: userId }
const socketToUser = new Map();

io.on('connection', (socket) => {
  let socketUserId;
  let socketFamilyId;
  
  try {
    const auth = socket.handshake.auth || {};
    socketUserId = auth.userId;
    socketFamilyId = auth.familyId;
    
    if (!socketUserId) {
      console.warn('Connection without userId, disconnecting');
      socket.disconnect();
      return;
    }
    
    console.log(`User connected: ${socketUserId} (Family: ${socketFamilyId})`);
    activeUsers.set(socketUserId, socket.id);
    socketToUser.set(socket.id, socketUserId);
    
    // Join Family Room
    if (socketFamilyId) {
        socket.join(socketFamilyId);
    }
    
    // Broadcast Status Online
    if (socketFamilyId) {
      io.to(socketFamilyId).emit('family:update', { userId: socketUserId, status: 'ONLINE' });
    }
  } catch (err) {
    console.error('Error in connection handler:', err);
    socket.disconnect();
    return;
  }

  // --- WebRTC Signaling ---

  socket.on('call:offer', (data) => {
    try {
      const { calleeId, signal } = data || {};
      if (!calleeId || !signal) {
        console.error('Invalid call:offer data:', data);
        return;
      }
      
      const calleeSocketId = activeUsers.get(calleeId);
      if (calleeSocketId) {
          console.log(`Call offer from ${socketUserId} to ${calleeId}`);
          io.to(calleeSocketId).emit('call:incoming', { 
              callerId: socketUserId, 
              signal 
          });
      } else {
          console.log(`User ${calleeId} not found/offline`);
          socket.emit('call:error', { message: 'User not online' });
      }
    } catch (err) {
      console.error('Error handling call:offer:', err);
      socket.emit('call:error', { message: 'Server error' });
    }
  });

  socket.on('call:answer', (data) => {
    try {
      const { callerId, signal } = data || {};
      if (!callerId || !signal) {
        console.error('Invalid call:answer data:', data);
        return;
      }
      
      const callerSocketId = activeUsers.get(callerId);
      if (callerSocketId) {
          console.log(`Call answer from ${socketUserId} to ${callerId}`);
          io.to(callerSocketId).emit('call:answered', { signal });
      }
    } catch (err) {
      console.error('Error handling call:answer:', err);
    }
  });

  socket.on('call:candidate', (data) => {
    try {
      const { targetId, candidate } = data || {};
      if (!targetId || !candidate) {
        return; // ICE candidates can be null/empty, that's OK
      }
      
      const targetSocketId = activeUsers.get(targetId);
      if (targetSocketId) {
          io.to(targetSocketId).emit('call:candidate', { candidate });
      }
    } catch (err) {
      console.error('Error handling call:candidate:', err);
    }
  });

  socket.on('call:end', (data) => {
    try {
      const { targetId } = data || {};
      if (targetId) {
        const targetSocketId = activeUsers.get(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call:ended');
        }
      }
    } catch (err) {
      console.error('Error handling call:end:', err);
    }
  });

  // --- Location ---

  socket.on('location:update', (location) => {
      // Broadcast location to family members (parents mainly)
      if (socketFamilyId) {
          socket.to(socketFamilyId).emit('location:update', { userId: socketUserId, location });
      }
  });

  // --- Disconnect ---

  socket.on('disconnect', () => {
    try {
      const uid = socketToUser.get(socket.id) || socketUserId;
      if (uid) {
          console.log(`User disconnected: ${uid}`);
          activeUsers.delete(uid);
          socketToUser.delete(socket.id);
          
          const disconnectFamilyId = socket.handshake.auth?.familyId || socketFamilyId;
          if (disconnectFamilyId) {
              io.to(disconnectFamilyId).emit('family:update', { userId: uid, status: 'OFFLINE' });
          }
      }
    } catch (err) {
      console.error('Error in disconnect handler:', err);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SKYE Server running on port ${PORT}`);
});
