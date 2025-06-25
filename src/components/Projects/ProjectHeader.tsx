import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProjectHeaderProps {
  onCreateProject: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ onCreateProject }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-2xl font-semibold text-[#1E4D3A] dark:text-white">{t('projects.title')}</h1>
      <button 
        onClick={onCreateProject}
        className="bg-gradient-to-r from-[#2563eb] via-[#9333ea] to-[#db2777] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center"
      >
        <Plus size={18} className="mr-2" />
        {t('projects.create.title')}
      </button>
    </div>
  );
};

export default ProjectHeader;