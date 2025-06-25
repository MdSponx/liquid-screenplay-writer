import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface KeyboardShortcutsDialogProps {
  isDarkMode: boolean;
  onClose: () => void;
}

interface ShortcutCategory {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  isDarkMode,
  onClose,
}) => {
  const { t } = useLanguage();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const modKey = isMac ? '⌘' : 'Ctrl';
  const altKey = isMac ? '⌥' : 'Alt';
  
  const categories: ShortcutCategory[] = [
    {
      title: 'General',
      shortcuts: [
        { keys: [modKey, 'Z'], description: 'Undo' },
        { keys: [modKey, 'Shift', 'Z'], description: 'Redo' },
        { keys: [modKey, 'A'], description: 'Select all blocks' },
        { keys: [modKey, 'S'], description: 'Save screenplay' },
      ]
    },
    {
      title: 'Editing',
      shortcuts: [
        { keys: ['Tab'], description: 'Cycle through block formats' },
        { keys: ['Enter'], description: 'Create new block (follows screenplay format rules)' },
        { keys: ['Backspace'], description: 'Delete empty block and move to previous' },
        { keys: ['Double Enter'], description: 'In dialogue: create action block' },
      ]
    },
    {
      title: 'Block Formatting',
      shortcuts: [
        { keys: [altKey, '1'], description: 'Format as Scene Heading' },
        { keys: [altKey, '2'], description: 'Format as Action' },
        { keys: [altKey, '3'], description: 'Format as Character' },
        { keys: [altKey, '4'], description: 'Format as Parenthetical' },
        { keys: [altKey, '5'], description: 'Format as Dialogue' },
        { keys: [altKey, '6'], description: 'Format as Transition' },
        { keys: [altKey, '7'], description: 'Format as Text' },
        { keys: [altKey, '8'], description: 'Format as Shot' },
      ]
    },
    {
      title: 'Selection',
      shortcuts: [
        { keys: ['Click'], description: 'Select block' },
        { keys: ['Shift', 'Click'], description: 'Select range of blocks' },
        { keys: [modKey, 'Click'], description: 'Toggle block selection' },
        { keys: ['Drag'], description: 'Select text across blocks' },
      ]
    },
  ];

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
            Keyboard Shortcuts
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {categories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ${
                        isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`text-base ${
                          isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}
                      >
                        {shortcut.description}
                      </div>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd
                              className={`px-2 py-1 text-sm font-semibold rounded ${
                                isDarkMode
                                  ? 'bg-gray-800 text-gray-200 border border-gray-600'
                                  : 'bg-gray-200 text-gray-700 border border-gray-300'
                              }`}
                            >
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
            Pro tip: Press {altKey}+1 through {altKey}+8 to quickly format blocks without using the format buttons!
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsDialog;