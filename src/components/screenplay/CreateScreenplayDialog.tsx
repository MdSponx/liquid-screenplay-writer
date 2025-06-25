import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, FileText, Film, Info, Users, ChevronRight,
  Check, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useScreenplayCreation } from '../../hooks/useScreenplayCreation';

interface CreateScreenplayDialogProps {
  project: {
    id: string;
    title: string;
    format: 'Movie' | 'Short Film' | 'Series' | 'Micro Drama';
    episodes?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

interface ScreenplayFormData {
  title: string;
  logline: string;
  genre: string[];
  author: string;
  collaborators: string[];
  season?: number;
  episode?: number;
}

const GENRES = [
  { id: 'action', name: 'Action', emoji: '💥' },
  { id: 'comedy', name: 'Comedy', emoji: '😂' },
  { id: 'drama', name: 'Drama', emoji: '🎭' },
  { id: 'horror', name: 'Horror', emoji: '👻' },
  { id: 'romance', name: 'Romance', emoji: '💝' },
  { id: 'thriller', name: 'Thriller', emoji: '🔪' },
  { id: 'scifi', name: 'Science Fiction', emoji: '🚀' },
  { id: 'fantasy', name: 'Fantasy', emoji: '🐉' }
];

const CreateScreenplayDialog: React.FC<CreateScreenplayDialogProps> = ({
  project,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ScreenplayFormData>({
    title: project.title,
    logline: '',
    genre: [],
    author: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || '',
    collaborators: [],
    season: 1,
    episode: 1
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createScreenplay, createSeriesScreenplays } = useScreenplayCreation();

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setError('');
      setFormData({
        title: project.title,
        logline: '',
        genre: [],
        author: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || '',
        collaborators: [],
        season: 1,
        episode: 1
      });
    }
  }, [isOpen, project.title, user]);

  const handleGenreToggle = (genreId: string) => {
    setFormData(prev => {
      const genres = prev.genre.includes(genreId)
        ? prev.genre.filter(g => g !== genreId)
        : [...prev.genre, genreId];
      return { ...prev, genre: genres };
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      if (project.format === 'Series' || project.format === 'Micro Drama') {
        // Create multiple screenplays for series
        const screenplayIds = await createSeriesScreenplays({
          projectId: project.id,
          ownerId: user?.id || '',
          baseTitle: formData.title,
          episodes: project.episodes || 1,
          metadata: {
            format: project.format,
            logline: formData.logline,
            genre: formData.genre,
            author: formData.author,
            season: formData.season
          },
          collaborators: formData.collaborators
        });
        
        if (!screenplayIds || screenplayIds.length === 0) {
          throw new Error('Failed to create episodes');
        }
        
        navigate(`/projects/${project.id}/writing`);
      } else {
        // Create single screenplay for movies
        const screenplayId = await createScreenplay({
          title: formData.title,
          projectId: project.id,
          ownerId: user?.id || '',
          metadata: {
            format: project.format,
            logline: formData.logline,
            genre: formData.genre,
            author: formData.author
          },
          collaborators: formData.collaborators
        });
        
        if (!screenplayId) {
          throw new Error('Failed to create screenplay');
        }
        
        // Navigate to the editor with the new screenplay ID
        navigate(`/projects/${project.id}/screenplays/${screenplayId}/editor`);
      }

      onClose();
    } catch (err) {
      console.error('Error creating screenplay:', err);
      setError('Failed to create screenplay. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">
              Create New Screenplay
            </h3>
            <button
              onClick={onClose}
              className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 1 
                  ? 'bg-[#E86F2C] text-white' 
                  : 'bg-[#E86F2C]/20 text-[#E86F2C]'
              }`}>
                <FileText size={16} />
              </div>
              <div className={`h-1 flex-1 mx-2 ${
                step > 1 ? 'bg-[#E86F2C]' : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            </div>
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 2 
                  ? 'bg-[#E86F2C] text-white' 
                  : step > 2 
                  ? 'bg-[#E86F2C]/20 text-[#E86F2C]'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                <Film size={16} />
              </div>
              <div className={`h-1 flex-1 mx-2 ${
                step > 2 ? 'bg-[#E86F2C]' : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            </div>
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 3 
                  ? 'bg-[#E86F2C] text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                <Users size={16} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 mr-3" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Screenplay Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Logline
                </label>
                <textarea
                  value={formData.logline}
                  onChange={(e) => setFormData({ ...formData, logline: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  rows={3}
                  placeholder="A one-sentence summary of your screenplay..."
                />
              </div>

              {(project.format === 'Series' || project.format === 'Micro Drama') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                      Season
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.season}
                      onChange={(e) => setFormData({ ...formData, season: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                      Total Episodes
                    </label>
                    <input
                      type="number"
                      value={project.episodes}
                      disabled
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600 bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-4">
                  Genre
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {GENRES.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreToggle(genre.id)}
                      className={`px-4 py-3 rounded-lg border ${
                        formData.genre.includes(genre.id)
                          ? 'border-[#E86F2C] bg-[#E86F2C]/10 text-[#E86F2C]'
                          : 'border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-400 hover:border-[#E86F2C]/50'
                      } flex items-center justify-between transition-all duration-200 hover:scale-[1.02]`}
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{genre.emoji}</span>
                        <span>{genre.name}</span>
                      </div>
                      {formData.genre.includes(genre.id) && (
                        <Check size={16} className="ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-blue-800 dark:text-blue-200 font-medium">Ready to Create</p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                    {project.format === 'Series' || project.format === 'Micro Drama'
                      ? `This will create ${project.episodes} episode screenplays for your series.`
                      : 'Your screenplay will be created with an initial scene to get you started.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[#1E4D3A] dark:text-white font-medium">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-[#577B92] dark:text-gray-400">Title</span>
                    <span className="text-[#1E4D3A] dark:text-white font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-[#577B92] dark:text-gray-400">Format</span>
                    <span className="text-[#1E4D3A] dark:text-white font-medium">{project.format}</span>
                  </div>
                  {(project.format === 'Series' || project.format === 'Micro Drama') && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-[#577B92] dark:text-gray-400">Season</span>
                        <span className="text-[#1E4D3A] dark:text-white font-medium">{formData.season}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-[#577B92] dark:text-gray-400">Episodes</span>
                        <span className="text-[#1E4D3A] dark:text-white font-medium">{project.episodes}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-[#577B92] dark:text-gray-400">Genre</span>
                    <span className="text-[#1E4D3A] dark:text-white font-medium">
                      {formData.genre.map(g => 
                        GENRES.find(genre => genre.id === g)?.name
                      ).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-[#577B92] dark:text-gray-400">Author</span>
                    <span className="text-[#1E4D3A] dark:text-white font-medium">{formData.author}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center"
              disabled={step === 1 && !formData.title.trim()}
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Screenplay'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateScreenplayDialog;