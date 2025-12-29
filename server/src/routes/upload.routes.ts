import express from 'express';
import { upload } from '../utils/upload';
import { authMiddleware } from '../middleware/auth.middleware';
import path from 'path';

const router = express.Router();

// Загрузка файла
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не загружен' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// Загрузка нескольких файлов
router.post('/multiple', authMiddleware, upload.array('files', 10), (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res.status(400).json({ message: 'Файлы не загружены' });
  }

  const files = (req.files as Express.Multer.File[]).map((file) => ({
    url: `/uploads/${file.filename}`,
    filename: file.filename,
  }));

  res.json({ files });
});

export default router;

