import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: {
    _id: string;
    author: any;
    content?: string;
    images: string[];
    likes: string[];
    comments: string[];
    createdAt: string;
  };
}

export default function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/post/${post._id}`)}
    >
      {post.images.length > 0 && (
        <img
          src={post.images[0]}
          alt="Post"
          className="w-full h-64 object-cover"
        />
      )}
      {!post.images.length && post.content && (
        <div className="p-4">
          <p className="text-gray-900 line-clamp-3">{post.content}</p>
        </div>
      )}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{post.likes.length} ❤️</span>
          <span>{post.comments.length} 💬</span>
        </div>
      </div>
    </div>
  );
}

