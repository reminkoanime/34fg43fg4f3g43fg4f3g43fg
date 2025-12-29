import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  author: mongoose.Types.ObjectId;
  media: string;
  mediaType: 'image' | 'video';
  views: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
}

const StorySchema = new Schema<IStory>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  media: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
  views: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
  },
}, {
  timestamps: true,
});

StorySchema.index({ author: 1, createdAt: -1 });
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IStory>('Story', StorySchema);

