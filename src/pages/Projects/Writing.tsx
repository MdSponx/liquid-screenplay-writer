import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, FileText, ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ProjectSidebar from '../../components/Projects/ProjectSidebar';
import ScreenplayList from '../../components/screenplay/ScreenplayList';
import CreateScreenplayDialog from '../../components/screenplay/CreateScreenplayDialog';
import { useScreenplays } from '../../hooks/useScreenplays';
import type { Project } from '../../types/project';

const Writing: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [activeTab, setActiveTab] = useState('screenplay-files');
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // Ensure useScreenplays receives projectId, which is already handled by useParams
  const { screenplays, loading, error, loadScreenplayDetails } = useScreenplays(projectId || '');
  const [loadingScreenplayId, setLoadingScreenplayId] = useState<string | null>(null);

  // Handle screenplay click to navigate to editor
  const handleScreenplayClick = async (screenplayId: string) => {
    // Ensure projectId exists before proceeding
    if (!projectId) {
      console.error('Project ID is missing when trying to load screenplay.');
      // Display a user-friendly message, as alert() is discouraged
      // In a real app, you might use a modal or a toast notification
      // For this example, we'll navigate back to projects as a fallback.
      navigate('/projects'); 
      return;
    }
    
    try {
      setLoadingScreenplayId(screenplayId);
      console.log(`Loading screenplay ${screenplayId} for project ${projectId}`);
      
      // Load screenplay details from Firestore
      const details = await loadScreenplayDetails(screenplayId, user?.id || 'unknown');
      
      // If screenplay details could not be loaded, show an error and return
      if (!details) {
        console.error(`Failed to load details for screenplay ${screenplayId}.`);
        // Display a user-friendly message
        // For now, navigating back to writing overview.
        navigate(`/projects/${projectId}/writing`);
        return;
      }
      
      // Navigate to the ScreenplayEditor using the new URL structure
      // The `projectId` and `screenplayId` are now part of the URL path,
      // and `screenplayData` and `blocks` are passed via `location.state`.
      navigate(`/projects/${projectId}/screenplays/${screenplayId}/editor`, {
        state: {
          screenplayData: details.screenplayData,
          blocks: details.blocks
        }
      });
    } catch (err) {
      // Catch any unexpected errors during the loading and navigation process
      console.error('An unexpected error occurred in handleScreenplayClick:', err);
      // Display a user-friendly message
      // For now, navigating back to writing overview.
      navigate(`/projects/${projectId}/writing`);
    } finally {
      // Always reset the loading state regardless of success or failure
      setLoadingScreenplayId(null);
    }
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      // Ensure projectId exists before fetching project data
      if (!projectId) {
        setProjectError('Project ID is missing. Cannot fetch project data.');
        setProjectLoading(false);
        return;
      }

      try {
        setProjectLoading(true);
        setProjectError(null);
        
        // Reference to the specific project document in Firestore
        const projectRef = doc(db, 'projects', projectId);
        // Fetch the project document
        const projectSnap = await getDoc(projectRef);

        // Check if the project document exists
        if (projectSnap.exists()) {
          // Cast the document data to the Project interface and set it in state
          const projectData = projectSnap.data() as Project;
          setProject({ ...projectData, id: projectSnap.id });
        } else {
          // If project not found, set an error message
          setProjectError('Project not found. It might have been deleted or moved.');
        }
      } catch (err) {
        // Catch any errors during the Firestore fetch operation
        console.error('Error fetching project data from Firestore:', err);
        setProjectError('Failed to load project data. Please check your internet connection or try again.');
      } finally {
        // Ensure loading state is turned off whether fetch succeeds or fails
        setProjectLoading(false);
      }
    };

    // Call the fetch function when the component mounts or projectId changes
    fetchProjectData();
  }, [projectId]); // Dependency array includes projectId to re-run effect when it changes

  // Display an error state if projectId is missing initially
  if (!projectId) {
    console.error('Writing component: No project ID provided in URL parameters.');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 text-red-500 mb-4">
            <AlertCircle size={64} className="mx-auto" />
          </div>
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">Missing project ID. Please select a project.</p>
          <button 
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-[#1E4D3A] text-white rounded-lg hover:bg-[#1E4D3A]/90"
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  // Display a loading state while project data is being fetched
  if (projectLoading) {
    console.log('Writing component: Project data is loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#577B92] dark:text-gray-400">Loading project data...</p>
        </div>
      </div>
    );
  }

  // Display an error state if there was an issue fetching project data
  if (projectError) {
    console.error('Writing component: Error loading project data:', projectError);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 text-red-500 mb-4">
            <AlertCircle size={64} className="mx-auto" />
          </div>
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">{projectError}</p>
          <button 
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-[#1E4D3A] text-white rounded-lg hover:bg-[#1E4D3A]/90"
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  // Display a fallback if project data is still null after loading (should be covered by projectError)
  if (!project) {
    console.error('Writing component: Project data is unexpectedly null after loading process.');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F2] dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 text-red-500 mb-4">
            <AlertCircle size={64} className="mx-auto" />
          </div>
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">Project data is unavailable.</p>
          <button 
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-[#1E4D3A] text-white rounded-lg hover:bg-[#1E4D3A]/90"
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  // Main rendering of the Writing component
  return (
    <div className="flex h-screen bg-[#F5F5F2] dark:bg-gray-800">
      {/* ProjectSidebar: displays project details and allows module navigation */}
      <ProjectSidebar
        project={project}
        activeModule="writing"
        // onModuleChange is not used here as navigation is handled by react-router-dom
        onModuleChange={(moduleKey) => {
          // Example: If a module needed to change the URL, you'd do it here
          // navigate(`/projects/${projectId}/${moduleKey}`);
          console.log(`Module change requested for: ${moduleKey}`);
        }}
      />

      {/* Main content area for writing functionalities */}
      <div className="flex-1 overflow-auto">
        {/* Header section with back button, project title, and collaborators */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back Button and Title */}
            <div className="h-16 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Button to navigate back to the dynamic project overview */}
                <button
                  onClick={() => navigate(`/projects/${projectId}`)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ArrowLeft
                    size={20}
                    className="text-[#577B92] dark:text-gray-400"
                  />
                </button>
                {/* Title of the current section */}
                <h2 className="text-lg font-semibold text-[#1E4D3A] dark:text-white">
                  Writing
                </h2>
              </div>
              {/* Collaborators and Invite button section */}
              <div className="flex items-center space-x-4">
                {/* Display a small circle for each collaborator */}
                <div className="flex -space-x-2">
                  {project.collaborators.slice(0, 3).map((collaborator, index) => (
                    <div
                      key={collaborator.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 ${
                        // Assign different background colors based on index for visual variety
                        ['bg-blue-500', 'bg-purple-500', 'bg-green-500'][index]
                      } text-white`}
                    >
                      {/* Display the first letter of the collaborator's email in uppercase */}
                      {collaborator.email.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {/* If there are more than 3 collaborators, show a count */}
                  {project.collaborators.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center border-2 border-white dark:border-gray-900">
                      +{project.collaborators.length - 3}
                    </div>
                  )}
                </div>
                {/* Invite button */}
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white font-medium hover:opacity-90 transition-opacity flex items-center">
                  <UserPlus size={18} className="mr-2" />
                  Invite
                </button>
              </div>
            </div>

            {/* Tabs for different writing sub-sections */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
              <div className="flex -mb-px">
                {/* Drafting Board Tab */}
                <button
                  onClick={() => setActiveTab('drafting-board')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'drafting-board'
                      ? 'border-[#E86F2C] text-[#E86F2C]'
                      : 'border-transparent text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white'
                  }`}
                >
                  Drafting Board
                </button>
                {/* Screenplay Files Tab (active by default) */}
                <button
                  onClick={() => setActiveTab('screenplay-files')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'screenplay-files'
                      ? 'border-[#E86F2C] text-[#E86F2C]'
                      : 'border-transparent text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white'
                  }`}
                >
                  Screenplay Files
                </button>
                {/* Document Library Tab */}
                <button
                  onClick={() => setActiveTab('document-library')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'document-library'
                      ? 'border-[#E86F2C] text-[#E86F2C]'
                      : 'border-transparent text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white'
                  }`}
                >
                  Document Library
                </button>
              </div>
              {/* Project Type and Episodes display */}
              <div className="flex items-center">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    isDarkMode
                      ? 'bg-gray-800 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Type:{' '}
                  {project.type === 'Series'
                    ? `Series (${project.episodes} Episodes)`
                    : 'Feature Film'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area based on active tab */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'screenplay-files' && (
            <ScreenplayList
              screenplays={screenplays}
              projectId={projectId} // Ensure projectId is passed correctly
              onCreateScreenplay={() => setShowCreateDialog(true)}
              onScreenplayClick={handleScreenplayClick}
              loadingScreenplayId={loadingScreenplayId}
              loading={loading}
              error={error}
            />
          )}
          {/* Add content for other tabs here if needed */}
          {activeTab === 'drafting-board' && (
            <div className="text-center py-12 text-[#577B92] dark:text-gray-400">
              Drafting board content goes here.
            </div>
          )}
          {activeTab === 'document-library' && (
            <div className="text-center py-12 text-[#577B92] dark:text-gray-400">
              Document library content goes here.
            </div>
          )}
        </div>
      </div>

      {/* Create Screenplay Dialog: conditionally rendered */}
      {showCreateDialog && (
        <CreateScreenplayDialog
          project={project} // Pass the fetched project object
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
};

export default Writing;