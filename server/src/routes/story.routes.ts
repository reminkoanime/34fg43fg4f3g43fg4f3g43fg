import express from 'express';
import Story from '../models/Story.model';
import User from '../models/User.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// Создать историю
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { media, mediaType } = req.body;

    const story = new Story({
      author: req.userId,
      media,
      mediaType,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
    });

    await story.save();
    const populatedStory = await Story.findById(story._id)
      .populate('author', 'username avatar fullName');

    res.status(201).json(populatedStory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить истории из ленты (от подписок)
router.get('/feed', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const followingIds = [...user.following, user._id];
    const stories = await Story.find({
      author: { $in: followingIds },
      expiresAt: { $gt: new Date() },
    })
      .populate('author', 'username avatar fullName')
      .sort({ createdAt: -1 });

    // Группировка по авторам
    const storiesByAuthor: any = {};
    stories.forEach((story) => {
      const authorId = story.author.toString();
      if (!storiesByAuthor[authorId]) {
        storiesByAuthor[authorId] = {
          author: story.author,
          stories: [],
        };
      }
      storiesByAuthor[authorId].stories.push(story);
    });

    res.json(Object.values(storiesByAuthor));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить истории пользователя
router.get('/user/:userId', async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.params.userId,
      expiresAt: { $gt: new Date() },
    })
      .populate('author', 'username avatar fullName')
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Отметить историю как просмотренную
router.post('/:id/view', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'История не найдена' });
    }

    if (!story.views.includes(req.userId as any)) {
      story.views.push(req.userId as any);
      await story.save();
    }

    res.json({ message: 'История отмечена как просмотренная' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Удалить историю
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'История не найдена' });
    }

    if (story.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: 'История удалена' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

