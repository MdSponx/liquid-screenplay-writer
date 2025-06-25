import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Calendar, User, ChevronRight, 
  Plus, AlertCircle, Loader
} from 'lucide-react';

interface Screenplay {
  id: string;
  title: string;
  metadata: {
    format: 'Movie' | 'Series';
    episode?: number;
    season?: number;
    author: string;
  };
  status: 'Draft' | 'Final' | 'Revision';
  lastModified: any;
  version: number;
}

interface ScreenplayListProps {
  screenplays: Screenplay[];
  projectId: string;
  onCreateScreenplay?: () => void;
  onScreenplayClick?: (screenplayId: string) => void;
  loadingScreenplayId?: string | null;
  loading?: boolean;
  error?: string | null;
}

const ScreenplayList: React.FC<ScreenplayListProps> = ({
  screenplays,
  projectId,
  onCreateScreenplay,
  onScreenplayClick,
  loadingScreenplayId,
  loading,
  error
}) => {
  const navigate = useNavigate();

  const handleScreenplayClick = (screenplayId: string) => {
    if (onScreenplayClick) {
      // Use the custom handler if provided
      onScreenplayClick(screenplayId);
    } else {
      // Otherwise use the default navigation
      navigate(`/editor?project=${projectId}&screenplay=${screenplayId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-[#577B92] dark:text-gray-400">Loading screenplays...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-600 dark:text-red-400">
        <AlertCircle size={24} className="mb-2" />
        <span className="text-center">{error}</span>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[#1E4D3A] text-white rounded-lg hover:bg-[#1E4D3A]/90"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Check if screenplays is undefined or not an array
  if (!screenplays || !Array.isArray(screenplays)) {
    console.error('ScreenplayList: screenplays is not an array:', screenplays);
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-600 dark:text-red-400">
        <AlertCircle size={24} className="mb-2" />
        <span className="text-center">Error: Screenplay data is invalid</span>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[#1E4D3A] text-white rounded-lg hover:bg-[#1E4D3A]/90"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {screenplays.map((screenplay) => (
        <div
          key={screenplay.id}
          className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#577B92]/10 dark:border-gray-700 hover:border-[#E86F2C] transition-colors cursor-pointer"
          onClick={() => handleScreenplayClick(screenplay.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-2">
                {screenplay.title}
                {screenplay.metadata.format === 'Series' && (
                  <span className="ml-2 text-sm text-[#577B92] dark:text-gray-400">
                    S{screenplay.metadata.season} E{screenplay.metadata.episode}
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-[#577B92] dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar size={16} className="mr-1" />
                  {screenplay.lastModified?.toDate ? new Date(screenplay.lastModified.toDate()).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex items-center">
                  <User size={16} className="mr-1" />
                  {screenplay.metadata.author}
                </div>
                <div className="flex items-center">
                  <FileText size={16} className="mr-1" />
                  v{screenplay.version}
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-full text-sm mr-4 ${
                screenplay.status === 'Final'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : screenplay.status === 'Revision'
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {screenplay.status}
              </span>
              
              {/* Show loading indicator for screenplay being loaded */}
              {loadingScreenplayId === screenplay.id ? (
                <div className="w-5 h-5 border-2 border-[#E86F2C] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <ChevronRight size={20} className="text-[#577B92] dark:text-gray-400" />
              )}
            </div>
          </div>
        </div>
      ))}

      {screenplays.length === 0 && onCreateScreenplay && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-[#577B92]/50 dark:border-gray-600">
          <FileText size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-3" />
          <h4 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-2">No screenplays yet</h4>
          <p className="text-[#577B92] dark:text-gray-400 text-sm max-w-sm mx-auto mb-6">
            Create your first screenplay to start writing your story
          </p>
          <button
            onClick={onCreateScreenplay}
            className="px-6 py-2 bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Create Screenplay
          </button>
        </div>
      )}
    </div>
  );
};

export default ScreenplayList;