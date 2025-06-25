import React from 'react';
import { Eye, Edit, Trash } from 'lucide-react';

interface ProjectCardActionsProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDarkMode?: boolean;
}

const ProjectCardActions: React.FC<ProjectCardActionsProps> = ({
  onView,
  onEdit,
  onDelete,
  isDarkMode
}) => {
  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView();
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
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
    </div>
  );
};

export default ProjectCardActions;