import express from 'express';
import { Conversation, Message } from '../models/Message.model';
import User from '../models/User.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// Получить все беседы пользователя
router.get('/conversations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
    })
      .populate('participants', 'username avatar fullName isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Создать или получить беседу с пользователем
router.post('/conversations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: 'ID участника обязателен' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, participantId] },
    }).populate('participants', 'username avatar fullName isOnline lastSeen');

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.userId, participantId],
      });
      await conversation.save();
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username avatar fullName isOnline lastSeen');
    }

    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить сообщения беседы
router.get('/conversations/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Беседа не найдена' });
    }

    if (!conversation.participants.includes(req.userId as any)) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'username avatar fullName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages.reverse());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Отправить сообщение
router.post('/conversations/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, media, mediaType } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Беседа не найдена' });
    }

    if (!conversation.participants.includes(req.userId as any)) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    const message = new Message({
      conversation: conversation._id,
      sender: req.userId,
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

    res.status(201).json(populatedMessage);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Отметить сообщения как прочитанные
router.put('/conversations/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await Message.updateMany(
      {
        conversation: req.params.id,
        sender: { $ne: req.userId },
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    res.json({ message: 'Сообщения отмечены как прочитанные' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

