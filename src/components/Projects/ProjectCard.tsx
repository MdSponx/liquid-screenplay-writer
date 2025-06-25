import React from 'react';
import { Eye, Edit, Trash } from 'lucide-react';
import { Project } from '../../types/project';

interface ProjectMember {
  id: string;
  email: string;
  status: 'pending' | 'active' | 'inactive';
  role: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

interface ProjectCardProps {
  project: Project;
  members?: ProjectMember[];
  onNavigate: (path: string) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  isDarkMode?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  members = [],
  onNavigate,
  onEdit,
  onDelete,
  isDarkMode
}) => {
  const formatDate = (dateString: string | { seconds: number; nanoseconds: number }) => {
    try {
      // Handle Firestore Timestamp
      if (typeof dateString === 'object' && 'seconds' in dateString) {
        return new Date(dateString.seconds * 1000).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Handle ISO string
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid Date';
    }
  };

  // Filter active members only
  const activeMembers = members.filter(member => member.status === 'active');

  return (
    <div 
      className="flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer h-[280px]"
      onClick={() => onNavigate(`/projects/${project.id}`)}
    >
      {/* Cover Image */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
        {project.coverImage ? (
          <img 
            src={project.coverImage} 
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 ${project.coverColor || 'bg-gradient-to-br from-[#1E4D3A] to-[#577B92]'} flex items-center justify-center`}>
            <span className="text-white text-4xl font-bold">
              {project.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Project Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          {project.company && (
            <div className="text-sm text-white/80 mb-1">{project.company.name}</div>
          )}
          <h3 className="text-xl font-bold text-white mb-1">{project.title}</h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80">
              {project.scenes} scenes
            </p>
            <p className="text-sm text-white/80">
              Updated {formatDate(project.updated_at)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex -space-x-2">
          {activeMembers.slice(0, 3).map((member, index) => (
            <div
              key={`member-${member.id}-${index}`}
              className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium overflow-hidden"
            >
              {member.profileImage ? (
                <img 
                  src={member.profileImage} 
                  alt={member.firstName || member.email} 
                  className="w-full h-full object-cover"
                />
              ) : (
                member.email[0].toUpperCase()
              )}
            </div>
          ))}
          {activeMembers.length > 3 && (
            <div 
              key={`more-members-${project.id}`}
              className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm"
            >
              +{activeMembers.length - 3}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/editor?project=${project.id}`);
            }}
            className={`p-1.5 rounded-full transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-500 hover:text-[#1E4D3A] hover:bg-gray-100'
            }`}
            title="View project"
          >
            <Eye size={16} />
          </button>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className={`p-1.5 rounded-full transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-500 hover:text-[#1E4D3A] hover:bg-gray-100'
              }`}
              title="Edit project"
            >
              <Edit size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
              }}
              className={`p-1.5 rounded-full transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800'
                  : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
              }`}
              title="Delete project"
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;