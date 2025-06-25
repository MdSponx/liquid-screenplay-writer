import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  color
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-left hover:border-[#E86F2C] transition-colors group"
    >
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="text-lg font-semibold text-[#1E4D3A] dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-[#577B92] dark:text-gray-400">{description}</p>
    </button>
  );
};

export default QuickActionCard;