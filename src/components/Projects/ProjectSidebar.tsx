import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Users, Calendar, DollarSign, Film, 
  FolderOpen, Settings, ArrowLeft
} from 'lucide-react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import type { Project } from '../../types/project';

interface ProjectSidebarProps {
  project: Project;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  project,
  activeModule,
  onModuleChange
}) => {
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const menuItems = [
    { 
      icon: FileText, 
      label: 'Overview', 
      key: 'overview',
      onClick: () => navigate(`/projects/${project.id}`)
    },
    { 
      icon: FileText, 
      label: 'Writing', 
      key: 'writing',
      onClick: () => navigate(`/projects/${project.id}/writing`)
    },
    { 
      icon: Users, 
      label: 'Elements', 
      key: 'elements',
      onClick: () => onModuleChange('elements')
    },
    { 
      icon: Calendar, 
      label: 'Schedules', 
      key: 'schedules',
      onClick: () => onModuleChange('schedules')
    },
    { 
      icon: DollarSign, 
      label: 'Budgets', 
      key: 'budgets',
      onClick: () => onModuleChange('budgets')
    },
    { 
      icon: Film, 
      label: 'Cast and Crew', 
      key: 'cast-crew',
      onClick: () => onModuleChange('cast-crew')
    },
    { 
      icon: FolderOpen, 
      label: 'Files and Media', 
      key: 'files',
      onClick: () => onModuleChange('files')
    },
    { 
      icon: Settings, 
      label: 'Permissions', 
      key: 'permissions',
      onClick: () => onModuleChange('permissions'),
      divider: true
    }
  ];

  return (
    <div className={`w-64 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border-r border-[#577B92]/10 dark:border-gray-700 overflow-y-auto`}>
      <div className="p-4 border-b border-[#577B92]/10 dark:border-gray-700">
        <button 
          onClick={() => navigate('/projects')}
          className="flex items-center text-[#577B92] dark:text-gray-400 hover:text-[#1E4D3A] dark:hover:text-white mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Projects
        </button>
        <div className="flex items-center mb-2">
          {project.coverImage ? (
            <img 
              src={project.coverImage} 
              alt={project.title}
              className="w-10 h-10 rounded-lg object-cover mr-3"
            />
          ) : (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${project.coverColor || 'bg-[#1E4D3A]'}`}>
              <span className="text-white font-bold">{project.title.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-[#1E4D3A] dark:text-white truncate">
            {project.title}
          </h1>
        </div>
        <div className="flex text-sm text-[#577B92] dark:text-gray-400 mt-1 items-center">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            project.status === 'Draft' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
            project.status === 'In Progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
            project.status === 'Completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {project.format} • {project.status}
          </span>
        </div>
      </div>
      
      <nav className="px-2 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <React.Fragment key={item.key}>
              <li>
                <button
                  className={`flex items-center w-full px-3 py-2 text-left rounded-lg transition-colors ${
                    activeModule === item.key 
                      ? 'bg-[#E86F2C]/10 text-[#E86F2C]' 
                      : `text-[#577B92] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`
                  }`}
                  onClick={item.onClick}
                >
                  <item.icon size={18} className="mr-3" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
              {item.divider && (
                <div className="my-4 border-t border-[#577B92]/10 dark:border-gray-700" />
              )}
            </React.Fragment>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default ProjectSidebar;