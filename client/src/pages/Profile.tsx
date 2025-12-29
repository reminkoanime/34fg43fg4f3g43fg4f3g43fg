import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiUserPlus, FiUserMinus, FiMail, FiMapPin } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';
import PostCard from '../components/PostCard';

interface User {
  _id: string;
  username: string;
  fullName: string;
  bio?: string;
  avatar?: string;
  coverPhoto?: string;
  followers: any[];
  following: any[];
  posts: string[];
}

interface Post {
  _id: string;
  author: any;
  content?: string;
  images: string[];
  likes: string[];
  comments: string[];
  createdAt: string;
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchUser();
      fetchPosts();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data);
      setIsFollowing(
        response.data.followers.some((f: any) => f._id === currentUser?.id)
      );
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await api.get(`/users/${id}/posts`);
      setPosts(response.data);
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
    }
  };

  const handleFollow = async () => {
    try {
      await api.post(`/users/${id}/follow`);
      setIsFollowing(!isFollowing);
      fetchUser();
    } catch (error) {
      console.error('Ошибка подписки:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-12">Пользователь не найден</div>;
  }

  const isOwnProfile = currentUser?.id === user._id;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-r from-primary-400 to-primary-600 rounded-t-xl overflow-hidden">
        {user.coverPhoto && (
          <img src={user.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-b-xl shadow-sm p-6 -mt-20 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between">
          <div className="flex items-end space-x-4">
            <img
              src={
                user.avatar ||
                `https://ui-avatars.com/api/?name=${user.fullName}&background=0ea5e9&color=fff&size=128`
              }
              alt={user.fullName}
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
            />
            <div className="pb-4">
              <h1 className="text-3xl font-bold text-gray-900">{user.fullName}</h1>
              <p className="text-gray-500">@{user.username}</p>
              {user.bio && <p className="text-gray-700 mt-2">{user.bio}</p>}
            </div>
          </div>

          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              className={`mt-4 md:mt-0 px-6 py-2 rounded-lg font-medium transition-colors ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {isFollowing ? (
                <>
                  <FiUserMinus className="inline mr-2" />
                  Отписаться
                </>
              ) : (
                <>
                  <FiUserPlus className="inline mr-2" />
                  Подписаться
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex space-x-8 mt-6 pt-6 border-t border-gray-200">
          <div>
            <span className="font-bold text-gray-900">{posts.length}</span>
            <span className="text-gray-500 ml-2">Постов</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">{user.followers.length}</span>
            <span className="text-gray-500 ml-2">Подписчиков</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">{user.following.length}</span>
            <span className="text-gray-500 ml-2">Подписок</span>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Посты</h2>
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">Пользователь еще не опубликовал постов</p>
          </div>
        )}
      </div>
    </div>
  );
}

