import express from 'express';
import User from '../models/User.model';
import Post from '../models/Post.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// Получить пользователя по ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username avatar fullName')
      .populate('following', 'username avatar fullName');

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Поиск пользователей
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } },
      ],
    })
      .select('username fullName avatar bio')
      .limit(20);

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить профиль
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fullName, bio, avatar, coverPhoto } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { fullName, bio, avatar, coverPhoto },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Подписаться на пользователя
router.post('/:id/follow', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.userId!;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'Нельзя подписаться на себя' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const isFollowing = currentUser.following.includes(targetUser._id as any);

    if (isFollowing) {
      // Отписаться
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUserId
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId
      );
    } else {
      // Подписаться
      currentUser.following.push(targetUser._id as any);
      targetUser.followers.push(currentUser._id as any);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ isFollowing: !isFollowing });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить посты пользователя
router.get('/:id/posts', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.id })
      .populate('author', 'username avatar fullName')
      .populate('likes', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

