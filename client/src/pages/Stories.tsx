import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiX, FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';

interface Story {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
    fullName: string;
  };
  media: string;
  mediaType: 'image' | 'video';
  views: string[];
  createdAt: string;
}

interface StoriesByAuthor {
  author: any;
  stories: Story[];
}

export default function Stories() {
  const [storiesGroups, setStoriesGroups] = useState<StoriesByAuthor[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StoriesByAuthor | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await api.get('/stories/feed');
      setStoriesGroups(response.data);
    } catch (error) {
      console.error('Ошибка загрузки историй:', error);
    }
  };

  const handleStoryView = async (storyId: string) => {
    try {
      await api.post(`/stories/${storyId}/view`);
    } catch (error) {
      console.error('Ошибка отметки просмотра:', error);
    }
  };

  const handleNextStory = () => {
    if (!selectedGroup) return;

    if (currentStoryIndex < selectedGroup.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      handleStoryView(selectedGroup.stories[currentStoryIndex + 1]._id);
    } else {
      // Перейти к следующей группе историй
      const currentGroupIndex = storiesGroups.findIndex(
        (g) => g.author._id === selectedGroup.author._id
      );
      if (currentGroupIndex < storiesGroups.length - 1) {
        setSelectedGroup(storiesGroups[currentGroupIndex + 1]);
        setCurrentStoryIndex(0);
        handleStoryView(storiesGroups[currentGroupIndex + 1].stories[0]._id);
      }
    }
  };

  const handlePrevStory = () => {
    if (!selectedGroup) return;

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      // Перейти к предыдущей группе историй
      const currentGroupIndex = storiesGroups.findIndex(
        (g) => g.author._id === selectedGroup.author._id
      );
      if (currentGroupIndex > 0) {
        setSelectedGroup(storiesGroups[currentGroupIndex - 1]);
        setCurrentStoryIndex(storiesGroups[currentGroupIndex - 1].stories.length - 1);
        handleStoryView(
          storiesGroups[currentGroupIndex - 1].stories[
            storiesGroups[currentGroupIndex - 1].stories.length - 1
          ]._id
        );
      }
    }
  };

  const currentStory = selectedGroup?.stories[currentStoryIndex];

  if (selectedGroup && currentStory) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <button
          onClick={() => {
            setSelectedGroup(null);
            setCurrentStoryIndex(0);
          }}
          className="absolute top-4 right-4 text-white z-10"
        >
          <FiX className="w-8 h-8" />
        </button>

        <button
          onClick={handlePrevStory}
          className="absolute left-4 text-white z-10"
        >
          <FiChevronLeft className="w-8 h-8" />
        </button>

        <button
          onClick={handleNextStory}
          className="absolute right-4 text-white z-10"
        >
          <FiChevronRight className="w-8 h-8" />
        </button>

        <div className="relative w-full h-full flex items-center justify-center">
          {currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.media}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={currentStory.media}
              autoPlay
              loop
              className="max-w-full max-h-full"
            />
          )}

          {/* Story Header */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center space-x-3 text-white">
              <img
                src={
                  currentStory.author.avatar ||
                  `https://ui-avatars.com/api/?name=${currentStory.author.fullName}&background=0ea5e9&color=fff`
                }
                alt={currentStory.author.fullName}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold">{currentStory.author.fullName}</p>
                <p className="text-sm opacity-75">
                  {new Date(currentStory.createdAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Create Story */}
        <button
          className="aspect-[9/16] bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-primary-500 transition-colors"
          onClick={() => navigate('/create-story')}
        >
          <FiPlus className="w-12 h-12 text-gray-400 mb-2" />
          <span className="text-gray-600 font-medium">Создать историю</span>
        </button>

        {/* Stories Grid */}
        {storiesGroups.map((group) => (
          <button
            key={group.author._id}
            onClick={() => {
              setSelectedGroup(group);
              setCurrentStoryIndex(0);
              handleStoryView(group.stories[0]._id);
            }}
            className="aspect-[9/16] rounded-xl overflow-hidden relative shadow-sm hover:shadow-md transition-shadow"
          >
            <img
              src={
                group.author.avatar ||
                `https://ui-avatars.com/api/?name=${group.author.fullName}&background=0ea5e9&color=fff`
              }
              alt={group.author.fullName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <p className="font-semibold">{group.author.fullName}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

