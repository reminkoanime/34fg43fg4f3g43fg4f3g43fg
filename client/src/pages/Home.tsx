import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiHeart, FiMessageCircle, FiSend, FiMoreHorizontal, FiPlus } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import CreatePostModal from '../components/CreatePostModal';

interface Post {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
    fullName: string;
  };
  content?: string;
  images: string[];
  videos: string[];
  likes: string[];
  comments: string[];
  createdAt: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const response = await api.get('/posts/feed');
      setPosts(response.data);
    } catch (error) {
      console.error('Ошибка загрузки ленты:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await api.post(`/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: response.data.isLiked
                  ? [...post.likes, 'current-user']
                  : post.likes.filter((id) => id !== 'current-user'),
              }
            : post
        )
      );
    } catch (error) {
      console.error('Ошибка лайка:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Stories Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex space-x-4 overflow-x-auto pb-2">
          <button
            onClick={() => navigate('/stories')}
            className="flex-shrink-0 flex flex-col items-center space-y-2"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl">
              <FiPlus className="w-6 h-6" />
            </div>
            <span className="text-xs text-gray-600">Ваша история</span>
          </button>
          {/* Здесь будут истории других пользователей */}
        </div>
      </div>

      {/* Create Post Button */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full text-left text-gray-500 hover:text-gray-700"
        >
          Что у вас нового?
        </button>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Post Header */}
            <div className="p-4 flex items-center justify-between">
              <div
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => navigate(`/profile/${post.author._id}`)}
              >
                <img
                  src={
                    post.author.avatar ||
                    `https://ui-avatars.com/api/?name=${post.author.fullName}&background=0ea5e9&color=fff`
                  }
                  alt={post.author.fullName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-900">{post.author.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru })}
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <FiMoreHorizontal className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Post Content */}
            {post.content && (
              <div className="px-4 pb-4">
                <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
              </div>
            )}

            {/* Post Media */}
            {post.images.length > 0 && (
              <div className="w-full">
                {post.images.length === 1 ? (
                  <img src={post.images[0]} alt="Post" className="w-full object-cover" />
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {post.images.slice(0, 4).map((image, idx) => (
                      <img key={idx} src={image} alt={`Post ${idx + 1}`} className="w-full h-64 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Post Actions */}
            <div className="p-4">
              <div className="flex items-center space-x-6 mb-3">
                <button
                  onClick={() => handleLike(post._id)}
                  className={`flex items-center space-x-2 ${
                    post.likes.length > 0 ? 'text-red-600' : 'text-gray-600'
                  } hover:text-red-600 transition-colors`}
                >
                  <FiHeart
                    className={`w-6 h-6 ${post.likes.length > 0 ? 'fill-current' : ''}`}
                  />
                  <span>{post.likes.length}</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors">
                  <FiMessageCircle className="w-6 h-6" />
                  <span>{post.comments.length}</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors">
                  <FiSend className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Лента пуста</p>
          <p className="text-gray-400 mt-2">Подпишитесь на пользователей, чтобы видеть их посты</p>
        </div>
      )}

      {showCreateModal && (
        <CreatePostModal onClose={() => setShowCreateModal(false)} onPostCreated={fetchFeed} />
      )}
    </div>
  );
}

