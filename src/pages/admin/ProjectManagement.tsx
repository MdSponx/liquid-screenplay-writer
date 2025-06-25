import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Plus, MoreHorizontal, ChevronDown, 
  Check, X, FileText, Calendar, Users, Trash, Edit,
  AlertCircle, Download, Eye, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import Sidebar from '../../components/Sidebar';

interface Project {
  id: string;
  title: string;
  type: 'Movie' | 'Series' | 'Short';
  status: 'Active' | 'Completed' | 'Archived';
  createdAt: string;
  updatedAt: string;
  members: number;
  scenes: number;
  coverImage?: string;
}

const ProjectManagement: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Mock data
  const projects: Project[] = [
    {
      id: '1',
      title: 'Summer Romance',
      type: 'Movie',
      status: 'Active',
      createdAt: '2025-01-15',
      updatedAt: '2025-01-20',
      members: 8,
      scenes: 42,
      coverImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: '2',
      title: 'Midnight Express',
      type: 'Series',
      status: 'Active',
      createdAt: '2025-01-10',
      updatedAt: '2025-01-18',
      members: 12,
      scenes: 86,
      coverImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: '3',
      title: 'City Lights',
      type: 'Movie',
      status: 'Completed',
      createdAt: '2024-12-05',
      updatedAt: '2025-01-02',
      members: 6,
      scenes: 38,
      coverImage: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: '4',
      title: 'The Last Summer',
      type: 'Movie',
      status: 'Active',
      createdAt: '2025-01-05',
      updatedAt: '2025-01-19',
      members: 10,
      scenes: 56,
      coverImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1000&auto=format&fit=crop'
    },
    {
      id: '5',
      title: 'Echoes of Tomorrow',
      type: 'Series',
      status: 'Archived',
      createdAt: '2024-11-20',
      updatedAt: '2024-12-15',
      members: 4,
      scenes: 124,
      coverImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop'
    }
  ];

  const projectTypes = ['Movie', 'Series', 'Short'];
  const projectStatuses = ['Active', 'Completed', 'Archived'];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || project.type === selectedType;
    const matchesStatus = !selectedStatus || project.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedProjects(new Set(filteredProjects.map(project => project.id)));
      setShowBulkActions(true);
    }
  };

  const handleSelectProject = (id: string) => {
    const newSelectedProjects = new Set(selectedProjects);
    
    if (newSelectedProjects.has(id)) {
      newSelectedProjects.delete(id);
    } else {
      newSelectedProjects.add(id);
    }
    
    setSelectedProjects(newSelectedProjects);
    setShowBulkActions(newSelectedProjects.size > 0);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setShowConfirmDialog(true);
  };

  const confirmDeleteProject = () => {
    console.log(`Deleting project: ${projectToDelete?.title}`);
    setShowConfirmDialog(false);
    setProjectToDelete(null);
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on ${selectedProjects.size} projects`);
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeItem="company" />

      <div className="flex-1 overflow-auto bg-[#F5F5F2] dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/admin')}
                className="mr-4 p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowLeft size={20} className="text-[#1E4D3A] dark:text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">Project Management</h1>
                <p className="text-[#577B92] dark:text-gray-400 mt-1">
                  Manage all organization projects and their team members
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/projects/create')}
              className="bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center"
            >
              <Plus size={18} className="mr-2" />
              Create Project
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-[#577B92]/10 dark:border-gray-700 mb-6">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#577B92] dark:text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search projects by title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:border-[#E86F2C]"
                />
              </div>
              <div className="flex space-x-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowTypeFilter(!showTypeFilter)}
                    className="flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                  >
                    <Filter size={18} className="mr-2 text-[#577B92] dark:text-gray-400" />
                    <span>{selectedType || 'Type'}</span>
                    <ChevronDown size={16} className="ml-2 text-[#577B92] dark:text-gray-400" />
                  </button>
                  {showTypeFilter && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setSelectedType(null);
                            setShowTypeFilter(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          All Types
                        </button>
                        {projectTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setSelectedType(type);
                              setShowTypeFilter(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                          >
                            {selectedType === type && <Check size={16} className="mr-2 text-[#E86F2C]" />}
                            <span>{type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowStatusFilter(!showStatusFilter)}
                    className="flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
                  >
                    <Filter size={18} className="mr-2 text-[#577B92] dark:text-gray-400" />
                    <span>{selectedStatus || 'Status'}</span>
                    <ChevronDown size={16} className="ml-2 text-[#577B92] dark:text-gray-400" />
                  </button>
                  {showStatusFilter && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setSelectedStatus(null);
                            setShowStatusFilter(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          All Statuses
                        </button>
                        {projectStatuses.map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              setSelectedStatus(status);
                              setShowStatusFilter(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                          >
                            {selectedStatus === status && <Check size={16} className="mr-2 text-[#E86F2C]" />}
                            <span>{status}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <div className="bg-[#1E4D3A]/10 dark:bg-[#1E4D3A]/20 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-[#1E4D3A] dark:text-white font-medium">
                  {selectedProjects.size} projects selected
                </span>
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => handleBulkAction('archive')}
                  className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-[#1E4D3A] dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Archive
                </button>
                <button 
                  onClick={() => handleBulkAction('export')}
                  className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-[#1E4D3A] dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export
                </button>
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="px-4 py-2 bg-red-500 rounded-lg text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Projects Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-[#577B92]/10 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                        />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Scenes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#577B92] dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProjects.has(project.id)}
                          onChange={() => handleSelectProject(project.id)}
                          className="h-4 w-4 text-[#E86F2C] focus:ring-[#E86F2C] border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mr-3">
                            {project.coverImage ? (
                              <img 
                                src={project.coverImage} 
                                alt={project.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <FileText size={16} className="text-[#577B92] dark:text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#1E4D3A] dark:text-white">
                              {project.title}
                            </div>
                            <div className="text-xs text-[#577B92] dark:text-gray-400">
                              Created: {project.createdAt}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#1E4D3A] dark:text-white">{project.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.status === 'Active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : project.status === 'Completed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-[#577B92] dark:text-gray-400">
                          <Calendar size={14} className="mr-1" />
                          {project.updatedAt}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-[#1E4D3A] dark:text-white">
                          <Users size={14} className="mr-1 text-[#577B92] dark:text-gray-400" />
                          {project.members}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E4D3A] dark:text-white">
                        {project.scenes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => navigate(`/editor?project=${project.id}`)}
                            className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/projects/edit/${project.id}`)}
                            className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProject(project)}
                            className="text-[#577B92] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <Trash size={16} />
                          </button>
                          <div className="relative group">
                            <button className="text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white">
                              <MoreHorizontal size={16} />
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
                              <div className="py-1">
                                <button className="block w-full text-left px-4 py-2 text-sm text-[#1E4D3A] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                                  Duplicate
                                </button>
                                <button className="block w-full text-left px-4 py-2 text-sm text-[#1E4D3A] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                                  Export
                                </button>
                                <button className="block w-full text-left px-4 py-2 text-sm text-[#1E4D3A] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                                  Archive
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-1">No projects found</h3>
                <p className="text-[#577B92] dark:text-gray-400">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button className="flex items-center text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white">
              <Download size={16} className="mr-2" />
              Export Project List
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && projectToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4 text-red-500">
                <AlertCircle size={24} className="mr-2" />
                <h3 className="text-xl font-semibold">Delete Project</h3>
              </div>
              <p className="text-[#1E4D3A] dark:text-white mb-2">
                Are you sure you want to delete <span className="font-semibold">{projectToDelete.title}</span>?
              </p>
              <p className="text-[#577B92] dark:text-gray-400 text-sm">
                This action cannot be undone. All project data, including scripts and assets, will be permanently deleted.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowConfirmDialog(false);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteProject}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;