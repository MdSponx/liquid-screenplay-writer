import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project } from '../../types/project';

interface ProjectListProps {
  title: string;
  projects: Project[];
  viewMode: 'grid' | 'list';
  renderProject: (project: Project) => React.ReactNode;
  onCreateProject?: () => void;
  emptyStateText: string;
  emptyStateAction: string;
}

const ProjectList: React.FC<ProjectListProps> = ({
  title,
  projects,
  viewMode,
  renderProject,
  onCreateProject,
  emptyStateText,
  emptyStateAction,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-12">
      <h2 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-6">{title}</h2>
      {projects.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map(project => renderProject(project))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-[#577B92]/10 dark:border-gray-700 overflow-hidden">
            {/* List view table structure */}
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <FileText size={48} className="mx-auto text-[#577B92] dark:text-gray-500 mb-3" />
          <h4 className="text-lg font-medium text-[#1E4D3A] dark:text-white mb-2">{emptyStateText}</h4>
          <p className="text-[#577B92] dark:text-gray-400 text-sm max-w-sm mx-auto">{emptyStateAction}</p>
          {onCreateProject && (
            <button
              onClick={onCreateProject}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center"
            >
              <Plus size={18} className="mr-2" />
              {t('projects.create.title')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectList;