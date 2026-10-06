/* ============================================================
   Socket.io realtime layer
   - JWT handshake auth
   - Personal rooms  user_<id>
   - Consultation rooms  consultation_<id>
   - Presence broadcast + typing indicators
   ============================================================ */
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const config = require('../config');
const ctx = require('../context');

function attachSocket(server) {
  const io = new Server(server, {
    cors: { origin: config.corsOrigin, credentials: true },
    pingTimeout: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.user = jwt.verify(token, config.jwt.secret);
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      socket.join(`user_${socket.user.id}`);
      const c = (ctx.onlineUsers.get(socket.user.id) || 0) + 1;
      ctx.onlineUsers.set(socket.user.id, c);
      io.emit('presence', { user_id: socket.user.id, online: true });
    }

    socket.on('join_consultation', (id) => {
      socket.join(`consultation_${id}`);
    });

    socket.on('leave_consultation', (id) => {
      socket.leave(`consultation_${id}`);
    });

    socket.on('typing', ({ consultation_id, is_typing }) => {
      if (!socket.user) return;
      socket.to(`consultation_${consultation_id}`).emit('typing', {
        consultation_id,
        user_id: socket.user.id,
        is_typing,
      });
    });

    socket.on('disconnect', () => {
      if (!socket.user) return;
      const c = (ctx.onlineUsers.get(socket.user.id) || 1) - 1;
      if (c <= 0) {
        ctx.onlineUsers.delete(socket.user.id);
        io.emit('presence', { user_id: socket.user.id, online: false });
      } else {
        ctx.onlineUsers.set(socket.user.id, c);
      }
    });
  });

  return io;
}

module.exports = { attachSocket };
