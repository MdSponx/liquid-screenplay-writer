import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { SaveResult } from '../../types';

interface ConflictDialogProps {
  conflicts: NonNullable<SaveResult['conflicts']>;
  onResolve: (action: 'overwrite' | 'merge' | 'cancel') => void;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  conflicts,
  onResolve
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="flex items-center text-amber-500 mb-4">
            <AlertTriangle size={24} className="mr-2" />
            <h3 className="text-xl font-semibold">Conflicting Changes</h3>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Other users have made changes to some scenes while you were editing:
          </p>

          <div className="space-y-2 mb-6">
            {conflicts.map((conflict, index) => (
              <div 
                key={conflict.sceneId}
                className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <p className="text-amber-800 dark:text-amber-200">
                  Scene {index + 1} was modified by {conflict.userEmail} at{' '}
                  {conflict.timestamp.toDate().toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onResolve('overwrite')}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              <X size={18} className="mr-2" />
              Overwrite Their Changes
            </button>

            <button
              onClick={() => onResolve('merge')}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <Check size={18} className="mr-2" />
              Merge Changes
            </button>

            <button
              onClick={() => onResolve('cancel')}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictDialog;