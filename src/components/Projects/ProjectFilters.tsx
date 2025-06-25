import React from 'react';
import { Search, Filter, Grid, List, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProjectFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  typeFilter: string | null;
  onTypeFilterChange: (type: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  showTypeFilter: boolean;
  onShowTypeFilter: (show: boolean) => void;
  showStatusFilter: boolean;
  onShowStatusFilter: (show: boolean) => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  showTypeFilter,
  onShowTypeFilter,
  showStatusFilter,
  onShowStatusFilter,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-[#577B92]/10 dark:border-gray-700 mb-8">
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#577B92] dark:text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t('projects.filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:border-[#E86F2C]"
          />
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <button 
              onClick={() => onShowTypeFilter(!showTypeFilter)}
              className="flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
            >
              <Filter size={18} className="mr-2 text-[#577B92] dark:text-gray-400" />
              <span>{typeFilter || t('projects.filters.type')}</span>
              <ChevronDown size={16} className="ml-2 text-[#577B92] dark:text-gray-400" />
            </button>
            {showTypeFilter && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="p-2">
                  <button
                    onClick={() => {
                      onTypeFilterChange(null);
                      onShowTypeFilter(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {t('projects.filters.allTypes')}
                  </button>
                  {['Movie', 'Series'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        onTypeFilterChange(type);
                        onShowTypeFilter(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                    >
                      {typeFilter === type && <Check size={16} className="mr-2 text-[#E86F2C]" />}
                      <span>{t(`projects.types.${type.toLowerCase()}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button 
              onClick={() => onShowStatusFilter(!showStatusFilter)}
              className="flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
            >
              <Filter size={18} className="mr-2 text-[#577B92] dark:text-gray-400" />
              <span>{statusFilter || t('projects.filters.status')}</span>
              <ChevronDown size={16} className="ml-2 text-[#577B92] dark:text-gray-400" />
            </button>
            {showStatusFilter && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="p-2">
                  <button
                    onClick={() => {
                      onStatusFilterChange(null);
                      onShowStatusFilter(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {t('projects.filters.allStatuses')}
                  </button>
                  {['Draft', 'In Progress', 'Completed', 'Archived'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusFilterChange(status);
                        onShowStatusFilter(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                    >
                      {statusFilter === status && <Check size={16} className="mr-2 text-[#E86F2C]" />}
                      <span>{t(`projects.status.${status.toLowerCase().replace(' ', '')}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-[#E86F2C]/10 text-[#E86F2C]'
                  : 'text-[#577B92] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-[#E86F2C]/10 text-[#E86F2C]'
                  : 'text-[#577B92] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectFilters;