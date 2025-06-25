import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Moon,
  Sun,
  ZoomIn,
  ZoomOut,
  User,
  Languages,
  Printer,
  Info,
  Keyboard,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import SaveButton from './screenplay/SaveButton';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Instructions from './Instructions';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';
import ConflictDialog from './screenplay/ConflictDialog';
import type { SaveResult } from '../types/screenplay';

interface ScreenplayNavigatorProps {
  projectId: string | undefined;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number) => void;
  documentTitle: string;
  setDocumentTitle: (title: string) => void;
  onSave?: () => Promise<SaveResult>;
  isSaving?: boolean;
  hasChanges?: boolean;
}

const ScreenplayNavigator: React.FC<ScreenplayNavigatorProps> = ({
  projectId,
  isDarkMode,
  toggleDarkMode,
  zoomLevel,
  setZoomLevel,
  documentTitle,
  setDocumentTitle,
  onSave,
  isSaving = false,
  hasChanges = false,
}) => {
  const [showInstructions, setShowInstructions] = useState(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<
    NonNullable<SaveResult['conflicts']>
  >([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectTitle, setProjectTitle] = useState('');

  const MIN_ZOOM = 25;
  const MAX_ZOOM = 200;
  const ZOOM_STEP = 10;

  useEffect(() => {
    const fetchProjectTitle = async () => {
      if (!projectId) return;

      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
          setProjectTitle(projectSnap.data().title);
        }
      } catch (err) {
        console.error('Error fetching project:', err);
      }
    };

    fetchProjectTitle();
  }, [projectId]);

  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM));
  };

  const handleSave = async () => {
    if (!onSave || isSaving || !hasChanges) return;
    
    try {
      setSaveError(null);
      const result = await onSave();

      if (!result.success) {
        if (result.conflicts) {
          setConflicts(result.conflicts);
          setShowConflictDialog(true);
        } else {
          setSaveError(result.error || 'Failed to save screenplay');
        }
      } else {
        // Show success message briefly
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error saving screenplay:', err);
      setSaveError('Failed to save screenplay');
    }
  };

  const handleConflictResolution = async (
    action: 'overwrite' | 'merge' | 'cancel'
  ) => {
    setShowConflictDialog(false);
    
    if (action === 'cancel') {
      // Just close the dialog, no action needed
      return;
    }
    
    if (!onSave) {
      setSaveError('Save function is not available');
      return;
    }
    
    try {
      setSaveError(null);
      
      // Add conflict resolution action to the URL as a query parameter
      // This will be picked up by the useScreenplaySave hook
      const url = new URL(window.location.href);
      url.searchParams.set('conflict_resolution', action);
      window.history.replaceState({}, '', url.toString());
      
      // Try saving again with the conflict resolution strategy
      const result = await onSave();
      
      // Remove the conflict resolution parameter
      url.searchParams.delete('conflict_resolution');
      window.history.replaceState({}, '', url.toString());
      
      if (!result.success) {
        if (result.conflicts) {
          // If we still have conflicts, show the dialog again
          setConflicts(result.conflicts);
          setShowConflictDialog(true);
        } else {
          setSaveError(result.error || 'Failed to save screenplay');
        }
      } else {
        // Show success message briefly
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error resolving conflicts:', err);
      setSaveError('Failed to resolve conflicts');
      
      // Remove the conflict resolution parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('conflict_resolution');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Mock user data
  const collaborators = [
    { id: 3, name: 'Mike Johnson', isActive: true, color: 'bg-orange-500' },
    { id: 2, name: 'Sarah Chen', isActive: true, color: 'bg-green-500' },
    { id: 1, name: 'You', isActive: true, color: 'bg-blue-500' },
  ];

  const menuItems = ['file', 'edit', 'view', 'production', 'share', 'help'];

  const getNextLanguage = (current: string) => {
    const languages = ['en', 'th', 'zh'];
    const currentIndex = languages.indexOf(current);
    return languages[(currentIndex + 1) % languages.length];
  };

  const getLanguageTooltip = (current: string) => {
    switch (current) {
      case 'en':
        return 'Switch to Thai';
      case 'th':
        return '切换到中文';
      case 'zh':
        return 'Switch to English';
      default:
        return 'Switch language';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/writing`);
    } else {
      navigate('/projects');
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] ${
        isDarkMode ? 'bg-[#1E4D3A]' : 'bg-[#F5F5F2]'
      } shadow-sm`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar with Navigation */}
        <div className="h-16 flex items-center border-b border-[#577B92]/20">
          {/* Left Section with Back Button, Logo and Title */}
          <div className="flex items-center flex-1 space-x-4">
            <button
              onClick={handleBack}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode
                  ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                  : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
              }`}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => navigate('/')}
              className={`text-2xl font-semibold px-4 py-1 rounded-full font-mukta transition-colors duration-200
                ${
                  isDarkMode
                    ? 'bg-[#F5F5F2] text-[#1E4D3A] hover:bg-[#E8E8E5]'
                    : 'bg-[#1E4D3A] text-[#F5F5F2] hover:bg-[#1A4433]'
                }`}
            >
              LiQid
            </button>
            <div className="h-4 w-px bg-[#577B92]/20" />
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className={`text-lg font-medium bg-transparent border-b-2 border-transparent hover:border-[#577B92]/30 focus:border-[#E86F2C] focus:outline-none transition-colors duration-200 ${
                  isDarkMode ? 'text-[#F5F5F2]' : 'text-[#1E4D3A]'
                } px-2 py-1`}
                placeholder={projectTitle}
              />
            </div>
          </div>

          {/* Right Section with User Presence */}
          <div className="flex items-center -space-x-2">
            {collaborators.map((user) => (
              <div key={user.id} className="relative group">
                <button className={`p-2 rounded-full ${user.color} text-white`}>
                  <User size={16} />
                </button>
                <span className="absolute top-10 right-0 w-max bg-[#1E4D3A] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {user.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="h-12 flex items-center justify-between">
          {/* Left Section with Navigation Menu */}
          <div className="flex items-center space-x-4">
            <nav className="flex items-center space-x-2">
              {menuItems.map((item) => (
                <button
                  key={item}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200
                    ${
                      isDarkMode
                        ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                        : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
                    }`}
                >
                  {t(item)}
                </button>
              ))}
            </nav>
            <SaveButton 
              onSave={handleSave} 
              isSaving={isSaving} 
              hasChanges={hasChanges} 
            />
          </div>

          {/* Right Section with Print, Language, Zoom, Info, and Dark Mode */}
          <div className="flex items-center space-x-2">
            <div className="relative group">
              <button
                onClick={handlePrint}
                className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-colors duration-200
                  ${
                    isDarkMode
                      ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                      : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
                  }`}
                aria-label="Print document"
              >
                <Printer size={18} />
              </button>
              <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-max bg-[#1E4D3A] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Print document
              </span>
            </div>
            <div className="relative group">
              <button
                onClick={() => setLanguage(getNextLanguage(language))}
                className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-colors duration-200
                  ${
                    isDarkMode
                      ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                      : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
                  }`}
              >
                <Languages size={18} />
                <span className="text-sm font-medium">
                  {language.toUpperCase()}
                </span>
              </button>
              <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-max bg-[#1E4D3A] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {getLanguageTooltip(language)}
              </span>
            </div>
            <div className="flex items-center space-x-1 px-1">
              <button
                onClick={handleZoomOut}
                className={`p-1.5 rounded-lg transition-colors duration-200
                  ${
                    isDarkMode
                      ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                      : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
                  }
                  ${
                    zoomLevel <= MIN_ZOOM ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                disabled={zoomLevel <= MIN_ZOOM}
                aria-label="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <span
                className={`text-sm font-medium w-12 text-center
                ${isDarkMode ? 'text-[#F5F5F2]' : 'text-[#1E4D3A]'}`}
              >
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                className={`p-1.5 rounded-lg transition-colors duration-200
                  ${
                    isDarkMode
                      ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                      : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
                  }
                  ${
                    zoomLevel >= MAX_ZOOM ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                disabled={zoomLevel >= MAX_ZOOM}
                aria-label="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
            </div>
            <div className="relative group">
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className={`p-1.5 rounded-lg transition-colors duration-200
                  ${
                    isDarkMode
                      ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                      : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
                  }`}
                aria-label="Keyboard shortcuts"
              >
                <Keyboard size={18} />
              </button>
              <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-max bg-[#1E4D3A] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Keyboard shortcuts
              </span>
            </div>
            {!showInstructions && (
              <div className="relative group">
                <button
                  onClick={() => setShowInstructions(true)}
                  className={`p-1.5 rounded-lg transition-colors duration-200
                    ${
                      isDarkMode
                        ? 'text-[#F5F5F2] hover:bg-[#577B92]/20'
                        : 'text-[#1E4D3A] hover:bg-[#577B92]/10'
                    }`}
                  aria-label="Show instructions"
                >
                  <Info size={18} />
                </button>
                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-max bg-[#1E4D3A] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {t('show_instructions')}
                </span>
              </div>
            )}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors duration-200
                ${
                  isDarkMode
                    ? 'bg-[#577B92]/20 text-[#F5F5F2] hover:bg-[#577B92]/30'
                    : 'bg-[#577B92]/10 text-[#1E4D3A] hover:bg-[#577B92]/20'
                }`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Instructions Row */}
        <Instructions
          isDarkMode={isDarkMode}
          showInstructions={showInstructions}
          onClose={() => setShowInstructions(false)}
        />
      </div>

      {/* Keyboard Shortcuts Dialog */}
      {showKeyboardShortcuts && (
        <KeyboardShortcutsDialog
          isDarkMode={isDarkMode}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && (
        <ConflictDialog
          conflicts={conflicts}
          onResolve={handleConflictResolution}
        />
      )}

      {/* Save Error Toast */}
      {saveError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <X size={16} className="mr-2" />
          {saveError}
        </div>
      )}

      {/* Save Success Toast */}
      {showSaveSuccess && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <Check size={16} className="mr-2" />
          Changes saved successfully
        </div>
      )}
    </header>
  );
};

export default ScreenplayNavigator;