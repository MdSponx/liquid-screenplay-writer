import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Building,
  Film,
  Clock,
  Users,
  Tag,
  AlertCircle,
  Check,
  Info,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useScreenplayCreation } from '../../hooks/useScreenplayCreation';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: ProjectFormData) => Promise<any>;
}

interface Organization {
  id: string;
  name: string;
  role: string;
}

export interface ProjectFormData {
  title: string;
  coverImage?: File;
  coverImageUrl?: string;
  coverColor?: string;
  format: 'Movie' | 'Short Film' | 'Series' | 'Micro Drama';
  episodes?: number;
  length: number;
  ownership: 'personal' | 'organization';
  organizationId?: string;
  genre: string[];
  logline?: string; // เพิ่ม logline field
  status: 'Draft' | 'In Progress' | 'Completed' | 'Archived';
  collaborators: Array<{
    id: string;
    email: string;
    role: string;
  }>;
}

const FORMATS = ['Movie', 'Short Film', 'Series', 'Micro Drama'] as const;

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
  { id: 'mystery', name: 'Mystery', emoji: '🔍' },
  { id: 'musical', name: 'Musical', emoji: '🎵' }, //เพิ่มใหม่
  { id: 'lgbtq', name: 'LGBTQ+', emoji: '🌈' }, // เพิ่มใหม่
  { id: 'period', name: 'Period', emoji: '⏳' },
] as const;

// แยกฟังก์ชันอัปโหลดรูปภาพออกมาต่างหาก
const uploadImage = async (file: File, userId: string): Promise<string> => {
  if (!file) return '';

  try {
    const storageRef = ref(
      storage,
      `project-covers/${userId}/${Date.now()}-${file.name}`
    );
    const result = await uploadBytes(storageRef, file);
    return await getDownloadURL(result.ref);
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload image');
  }
};

const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    format: 'Movie',
    length: 90,
    ownership: 'personal',
    genre: [],
    logline: '',
    status: 'Draft',
    collaborators: [],
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationProgress, setCreationProgress] = useState<string | null>(null);
  const {
    createScreenplay,
    createSeriesScreenplays,
    loading,
    error: screenplayError,
  } = useScreenplayCreation();

  useEffect(() => {
    if (screenplayError) {
      setError(screenplayError);
    }
  }, [screenplayError]);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.email) return;

      try {
        const membersRef = collection(db, 'org_members');
        const memberQuery = query(
          membersRef,
          where('email', '==', user.email),
          where('role', '==', 'Admin')
        );
        const memberSnapshot = await getDocs(memberQuery);

        const orgs: Organization[] = [];

        for (const memberDoc of memberSnapshot.docs) {
          const memberData = memberDoc.data();
          if (memberData.organization_id) {
            const orgRef = doc(db, 'organizations', memberData.organization_id);
            const orgDoc = await getDoc(orgRef);

            if (orgDoc.exists()) {
              orgs.push({
                id: orgDoc.id,
                name: orgDoc.data().name,
                role: memberData.role,
              });
            }
          }
        }

        setOrganizations(orgs);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError('Failed to load organizations');
      }
    };

    if (isOpen) {
      fetchOrganizations();

      // Reset form state
      setFormData({
        title: '',
        format: 'Movie',
        length: 90,
        ownership: 'personal',
        genre: [],
        logline: '',
        status: 'Draft',
        collaborators: [],
      });
      setPreviewImage(null);
      setError('');
      setCreationProgress(null);
    }
  }, [user?.email, isOpen]);

  const generateCoverColor = (title: string): string => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-teal-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-pink-500 to-rose-600',
      'bg-gradient-to-br from-indigo-500 to-violet-600',
    ];

    const index = title.charAt(0).toLowerCase().charCodeAt(0) % colors.length;
    return colors[index];
  };

  // ใช้วิธีเรียบง่ายในการโหลดรูปภาพ
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
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

    setFormData((prev) => ({ ...prev, coverImage: file }));
  };

  const handleGenreToggle = (genreId: string) => {
    setFormData((prev) => {
      const currentGenres = prev.genre || [];
      if (currentGenres.includes(genreId)) {
        return { ...prev, genre: currentGenres.filter((g) => g !== genreId) };
      } else {
        return { ...prev, genre: [...currentGenres, genreId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user?.email) {
      setError('User information missing. Please sign in again.');
      return;
    }

    setError('');
    setCreationProgress(null);

    // Validate form data
    if (!formData.title.trim()) {
      setError('Please enter a project title.');
      return;
    }

    if (formData.genre.length === 0) {
      setError('Please select at least one genre.');
      return;
    }

    if (formData.ownership === 'organization' && !formData.organizationId) {
      setError('Please select an organization.');
      return;
    }

    if (
      (formData.format === 'Series' || formData.format === 'Micro Drama') &&
      (!formData.episodes || formData.episodes < 1)
    ) {
      setError('Please specify the number of episodes.');
      return;
    }

    try {
      setIsSubmitting(true);
      setCreationProgress('Preparing project data...');

      // แยกการอัปโหลดรูปภาพออกมา
      let coverImageUrl = '';
      if (formData.coverImage) {
        try {
          setCreationProgress('Uploading cover image...');
          coverImageUrl = await uploadImage(formData.coverImage, user.id);
        } catch (err) {
          console.error('Failed to upload image:', err);
          // ดำเนินการต่อแม้ว่าการอัปโหลดรูปภาพจะล้มเหลว
          setCreationProgress(
            'Failed to upload image, continuing with project creation...'
          );
        }
      }

      // Prepare project data
      const projectData: ProjectFormData = {
        ...formData,
        coverImageUrl,
        coverColor: generateCoverColor(formData.title),
        status: 'Draft',
        collaborators: [
          {
            id: user.id,
            email: user.email,
            role: 'Owner',
          },
        ],
      };

      // Create project
      setCreationProgress('Creating project...');
      const project = await onSubmit(projectData);

      if (!project || !project.id) {
        throw new Error('Failed to get project ID after creation');
      }

      // Create screenplays based on format
      if (formData.format === 'Series' || formData.format === 'Micro Drama') {
        setCreationProgress(`Creating ${formData.episodes} episodes...`);
        const screenplayIds = await createSeriesScreenplays({
          projectId: project.id,
          ownerId: user.id,
          baseTitle: formData.title,
          episodes: formData.episodes || 1,
          metadata: {
            format: formData.format,
            logline: formData.logline || '',
            genre: formData.genre,
            author:
              user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email,
            season: 1,
          },
        });

        if (!screenplayIds || screenplayIds.length === 0) {
          throw new Error('Failed to create episodes');
        }
      } else {
        setCreationProgress('Creating screenplay...');
        const screenplayId = await createScreenplay({
          title: formData.title,
          projectId: project.id,
          ownerId: user.id,
          metadata: {
            format: formData.format,
            logline: formData.logline || '',
            genre: formData.genre,
            author:
              user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email,
          },
        });

        if (!screenplayId) {
          throw new Error('Failed to create screenplay');
        }
      }

      onClose();
    } catch (err) {
      console.error('Error in project creation process:', err);
      setError(
        `Failed to create project: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setIsSubmitting(false);
      setCreationProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#1E4D3A] dark:text-white">
              Create New Project
            </h3>
            <button
              onClick={onClose}
              className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
              disabled={isSubmitting}
            >
              <X size={20} />
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          {creationProgress && (
            <div className="mt-4 p-4 bg-blue-100 text-blue-700 rounded-lg flex items-start">
              <Info size={20} className="mr-2 flex-shrink-0 mt-0.5" />
              <p>{creationProgress}</p>
            </div>
          )}
        </div>

        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Project Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                placeholder="Enter project title"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Cover Image
              </label>
              <div className="flex items-center space-x-4">
                <div
                  className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E86F2C] transition-colors overflow-hidden"
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full ${generateCoverColor(
                        formData.title
                      )} flex items-center justify-center text-white text-4xl font-bold`}
                    >
                      {formData.title.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isSubmitting}
                />
                <div className="text-sm text-[#577B92] dark:text-gray-400">
                  {previewImage
                    ? 'Click to change cover image'
                    : 'Upload a cover image (optional)'}
                  <p className="mt-1 text-xs">
                    Recommended size: 1280x720px. Max size: 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Format & Length */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      format: e.target.value as (typeof FORMATS)[number],
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  disabled={isSubmitting}
                >
                  {FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </div>

              {(formData.format === 'Series' ||
                formData.format === 'Micro Drama') && (
                <div>
                  <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                    Number of Episodes
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.episodes || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        episodes: parseInt(e.target.value) || undefined,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                    placeholder="Enter number of episodes"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                  Length (minutes)
                  {(formData.format === 'Series' ||
                    formData.format === 'Micro Drama') &&
                    ' per Episode'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.length}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      length: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  placeholder="Enter length in minutes"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Ownership */}
            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Project Ownership
              </label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() =>
                    !isSubmitting &&
                    setFormData({
                      ...formData,
                      ownership: 'personal',
                      organizationId: undefined,
                    })
                  }
                  className={`p-4 rounded-lg border ${
                    formData.ownership === 'personal'
                      ? 'border-[#E86F2C] bg-[#E86F2C]/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[#E86F2C]/50'
                  } flex items-center justify-center ${
                    isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  disabled={isSubmitting}
                >
                  <Film size={20} className="mr-2" />
                  <span>Personal Project</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    !isSubmitting &&
                    setFormData({ ...formData, ownership: 'organization' })
                  }
                  className={`p-4 rounded-lg border ${
                    formData.ownership === 'organization'
                      ? 'border-[#E86F2C] bg-[#E86F2C]/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[#E86F2C]/50'
                  } flex items-center justify-center ${
                    isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  disabled={isSubmitting}
                >
                  <Building size={20} className="mr-2" />
                  <span>Organization Project</span>
                </button>
              </div>

              {formData.ownership === 'organization' && (
                <select
                  value={formData.organizationId}
                  onChange={(e) =>
                    setFormData({ ...formData, organizationId: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-1">
                Logline (optional)
              </label>
              <textarea
                value={formData.logline || ''}
                onChange={(e) =>
                  setFormData({ ...formData, logline: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-[#E86F2C]"
                placeholder="Brief description of your project"
                rows={2}
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-[#577B92] dark:text-gray-400">
                A short summary of your project (1-2 sentences)
              </p>
            </div>

            {/* Genre Selection */}
            <div>
              <label className="block text-sm font-medium text-[#577B92] dark:text-gray-300 mb-2">
                Genre (select at least one)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {GENRES.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => !isSubmitting && handleGenreToggle(genre.id)}
                    className={`px-4 py-3 rounded-lg border ${
                      formData.genre.includes(genre.id)
                        ? 'border-[#E86F2C] bg-[#E86F2C]/10 text-[#E86F2C]'
                        : 'border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-400 hover:border-[#E86F2C]/50'
                    } flex items-center justify-between transition-all duration-200 hover:scale-[1.02] ${
                      isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    disabled={isSubmitting}
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
          </form>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
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
            disabled={
              !formData.title.trim() ||
              formData.genre.length === 0 ||
              isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {creationProgress ? 'Processing...' : 'Creating...'}
              </>
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectDialog;