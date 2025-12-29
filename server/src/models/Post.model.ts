import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  author: mongoose.Types.ObjectId;
  content?: string;
  images: string[];
  videos: string[];
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  shares: number;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    maxlength: 2000,
  },
  images: [{
    type: String,
  }],
  videos: [{
    type: String,
  }],
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  shares: {
    type: Number,
    default: 0,
  },
  location: {
    type: String,
  },
}, {
  timestamps: true,
});

PostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model<IPost>('Post', PostSchema);

