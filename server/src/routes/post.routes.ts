import express from 'express';
import Post from '../models/Post.model';
import Comment from '../models/Comment.model';
import User from '../models/User.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// Создать пост
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, images, videos, location } = req.body;
    const post = new Post({
      author: req.userId,
      content,
      images: images || [],
      videos: videos || [],
      location,
    });

    await post.save();
    await User.findByIdAndUpdate(req.userId, {
      $push: { posts: post._id },
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username avatar fullName')
      .populate('likes', 'username avatar');

    res.status(201).json(populatedPost);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить ленту постов
router.get('/feed', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const followingIds = [...user.following, user._id];
    const posts = await Post.find({ author: { $in: followingIds } })
      .populate('author', 'username avatar fullName')
      .populate('likes', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20)
      .skip(parseInt(req.query.skip as string) || 0);

    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить пост по ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username avatar fullName')
      .populate('likes', 'username avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar fullName',
        },
      });

    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }

    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Лайкнуть/убрать лайк с поста
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }

    const isLiked = post.likes.includes(req.userId as any);
    if (isLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.userId);
    } else {
      post.likes.push(req.userId as any);
    }

    await post.save();
    res.json({ isLiked: !isLiked, likesCount: post.likes.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Добавить комментарий
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }

    const comment = new Comment({
      author: req.userId,
      post: post._id,
      content,
    });

    await comment.save();
    post.comments.push(comment._id);
    await post.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username avatar fullName');

    res.status(201).json(populatedComment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить комментарии поста
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'username avatar fullName')
      .populate('likes', 'username avatar')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Удалить пост
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Пост не найден' });
    }

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(req.userId, {
      $pull: { posts: post._id },
    });

    res.json({ message: 'Пост удален' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

