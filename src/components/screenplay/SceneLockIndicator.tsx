import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import type { SceneLock } from '../../types';

interface SceneLockIndicatorProps {
  lock: SceneLock;
  onRequestAccess?: () => void;
}

const SceneLockIndicator: React.FC<SceneLockIndicatorProps> = ({
  lock,
  onRequestAccess
}) => {
  const timeLeft = Math.max(0, Math.floor(
    (lock.expires.toMillis() - Date.now()) / 1000 / 60
  ));

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
      <Lock className="flex-shrink-0" size={20} />
      <div>
        <p className="font-medium">Scene Locked</p>
        <p className="text-sm">
          Being edited by {lock.userId} ({timeLeft} min remaining)
        </p>
      </div>
      {onRequestAccess && (
        <button
          onClick={onRequestAccess}
          className="ml-4 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center"
        >
          <AlertCircle size={16} className="mr-2" />
          Request Access
        </button>
      )}
    </div>
  );
};

export default SceneLockIndicator;