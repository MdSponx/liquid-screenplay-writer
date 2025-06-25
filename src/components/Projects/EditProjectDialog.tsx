import React, { useState, useRef } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { Project } from '../../types/project';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

interface EditProjectDialogProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: Partial<Project>) => Promise<void>;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  project,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    title: project.title,
    format: project.format,
    episodes: project.episodes || undefined,
    length: project.length,
    genre: project.genre,
    status: project.status
  });

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(project.coverImage || null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const FORMATS = ['Movie', 'Short Film', 'Series', 'Micro Drama'] as const;
  const STATUSES = ['Draft', 'In Progress', 'Completed', 'Archived'] as const;

  const GENRES = [
    { id: 'action', name: 'Action', emoji: '💥' },
    { id: 'comedy', name: 'Comedy', emoji: '😂' },
    { id: 'drama', name: 'Drama', emoji: '🎭' },
    { id: 'horror', name: 'Horror', emoji: '👻' },
    { id: 'romance', name: 'Romance', emoji: '💝' },
    { id: 'thriller', name: 'Thriller', emoji: '🔪' },
    { id: 'scifi', name: 'Science Fiction', emoji: '🚀' },
    { id: 'fantasy', name: 'Fantasy', emoji: '🐉' },
    { id: 'documentary', name: 'Documentary', emoji: '📹' },
    { id: 'animation', name: 'Animation', emoji: '🎨' },
    { id: 'adventure', name: 'Adventure', emoji: '🗺️' },
    { id: 'mystery', name: 'Mystery', emoji: '🔍' }
  ] as const;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setCoverImage(file);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      let coverImageUrl = project.coverImage;
      if (coverImage) {
        const storageRef = ref(storage, `project-covers/${project.created_by}/${Date.now()}-${coverImage.name}`);
        await uploadBytes(storageRef, coverImage);
        coverImageUrl = await getDownloadURL(storageRef);
      }

      await onSubmit({
        ...formData,
        coverImage: coverImageUrl,
      });

      onClose();
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-4xl mx-auto my-4 flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header - Fixed */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">Edit Project</h3>
            <button
              onClick={onClose}
              className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Project Title
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
                Cover Image
              </label>
              <div className="flex items-center space-x-4">
                <div 
                  className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E86F2C] transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full ${project.coverColor || 'bg-gradient-to-br from-[#1E4D3A] to-[#577B92]'} flex items-center justify-center text-white text-4xl font-bold`}>
                      {formData.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <div className="text-sm text-[#577B92] dark:text-gray-400">
                  {previewImage ? 'Click to change cover image' : 'Upload a cover image (optional)'}
                  <p className="mt-1 text-xs">Recommended size: 1280x720px. Max size: 2MB</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as typeof FORMATS[number] })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                >
                  {FORMATS.map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>

              {(formData.format === 'Series' || formData.format === 'Micro Drama') && (
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Number of Episodes
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.episodes || ''}
                    onChange={(e) => setFormData({ ...formData, episodes: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Enter number of episodes"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Length (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  placeholder="Enter length in minutes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof STATUSES[number] })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                >
                  {STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-2">
                Genre
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {GENRES.map(genre => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => {
                      const newGenres = formData.genre.includes(genre.id)
                        ? formData.genre.filter(g => g !== genre.id)
                        : [...formData.genre, genre.id];
                      setFormData({ ...formData, genre: newGenres });
                    }}
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
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex-shrink-0">
          <div className="flex justify-end space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center"
              disabled={!formData.title.trim() || formData.genre.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProjectDialog;