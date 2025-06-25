import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface EnterBehaviorDialogProps {
  isDarkMode: boolean;
  onClose: () => void;
}

interface BlockBehavior {
  from: string;
  to: string;
  emoji: string;
  description: string;
}

const EnterBehaviorDialog: React.FC<EnterBehaviorDialogProps> = ({
  isDarkMode,
  onClose,
}) => {
  const { t } = useLanguage();

  const behaviors: BlockBehavior[] = [
    {
      from: t('scene-heading'),
      to: t('action'),
      emoji: '🎬',
      description: t('enter_rule_scene'),
    },
    {
      from: t('action'),
      to: t('character'),
      emoji: '🎭',
      description: t('enter_rule_action'),
    },
    {
      from: t('character'),
      to: t('dialogue'),
      emoji: '👤',
      description: t('enter_rule_character'),
    },
    {
      from: t('parenthetical'),
      to: t('dialogue'),
      emoji: '💭',
      description: t('enter_rule_parenthetical'),
    },
    {
      from: t('dialogue'),
      to: t('character'),
      emoji: '💬',
      description: t('enter_rule_dialogue'),
    },
    {
      from: t('dialogue'),
      to: t('action'),
      emoji: '⌨️',
      description: t('enter_rule_dialogue_double'),
    },
    {
      from: t('transition'),
      to: t('scene-heading'),
      emoji: '🔄',
      description: t('enter_rule_transition'),
    },
    {
      from: t('text'),
      to: t('action'),
      emoji: '📝',
      description: t('enter_rule_text'),
    },
    {
      from: t('shot'),
      to: t('action'),
      emoji: '🎥',
      description: t('enter_rule_shot'),
    },
  ];

  // Split behaviors into two columns
  const midPoint = Math.ceil(behaviors.length / 2);
  const leftColumn = behaviors.slice(0, midPoint);
  const rightColumn = behaviors.slice(midPoint);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-5xl h-[calc(100vh-8rem)] rounded-lg shadow-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <h2
            className={`text-xl font-semibold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}
          >
            {t('enter_rules_title')}
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full hover:bg-opacity-20 ${
              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 h-[calc(100%-8rem)] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Column */}
            <div className="space-y-4">
              {leftColumn.map((behavior, index) => (
                <div
                  key={index}
                  className={`flex items-center p-4 rounded-lg transition-colors duration-200 ${
                    isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-3xl mr-4">{behavior.emoji}</div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {behavior.from} → {behavior.to}
                    </div>
                    <div
                      className={`text-base ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}
                    >
                      {behavior.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {rightColumn.map((behavior, index) => (
                <div
                  key={index}
                  className={`flex items-center p-4 rounded-lg transition-colors duration-200 ${
                    isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-3xl mr-4">{behavior.emoji}</div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {behavior.from} → {behavior.to}
                    </div>
                    <div
                      className={`text-base ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}
                    >
                      {behavior.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div
            className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Pro tip: Double-press Enter in dialogue blocks to quickly switch to action!
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterBehaviorDialog;