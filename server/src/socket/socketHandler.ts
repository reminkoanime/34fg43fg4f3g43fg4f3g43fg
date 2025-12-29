import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import { Conversation, Message } from '../models/Message.model';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const socketHandler = (io: Server) => {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Токен не предоставлен'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as { userId: string };

      socket.userId = decoded.userId;
      
      // Обновить статус онлайн
      await User.findByIdAndUpdate(decoded.userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      next();
    } catch (error) {
      next(new Error('Недействительный токен'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`✅ Пользователь подключен: ${socket.userId}`);

      // Присоединиться к комнатам своих бесед
      const conversations = await Conversation.find({
        participants: socket.userId,
      });

      conversations.forEach((conv) => {
        socket.join(`conversation:${conv._id.toString()}`);
      });

    // Отправить сообщение
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, media, mediaType } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(socket.userId as any)) {
          return;
        }

        const message = new Message({
          conversation: conversationId,
          sender: socket.userId,
          content,
          media,
          mediaType,
        });

        await message.save();

        // Обновить последнее сообщение в беседе
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar fullName');

        // Отправить сообщение всем участникам беседы
        io.to(`conversation:${conversationId.toString()}`).emit('new_message', populatedMessage);
      } catch (error) {
        socket.emit('error', { message: 'Ошибка отправки сообщения' });
      }
    });

    // Типизация (пользователь печатает)
    socket.on('typing', (data) => {
      socket.to(`conversation:${data.conversationId.toString()}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    // Остановить типизацию
    socket.on('stop_typing', (data) => {
      socket.to(`conversation:${data.conversationId.toString()}`).emit('user_stop_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    // Отключение
    socket.on('disconnect', async () => {
      console.log(`❌ Пользователь отключен: ${socket.userId}`);
      
      // Обновить статус офлайн
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    });
  });
};

