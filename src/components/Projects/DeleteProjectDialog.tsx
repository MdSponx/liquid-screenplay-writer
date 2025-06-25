import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Project } from '../../types/project';

interface DeleteProjectDialogProps {
  project: Project | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteProjectDialog: React.FC<DeleteProjectDialogProps> = ({
  project,
  onClose,
  onConfirm,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');

  if (!project) return null;

  const handleConfirmDelete = () => {
    if (confirmationText !== project.title) {
      setError('Project name does not match');
      return;
    }
    setError('');
    onConfirm();
    // Clear the input after successful deletion
    setConfirmationText('');
  };

  const handleClose = () => {
    // Clear input and error when closing
    setConfirmationText('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4 text-red-500">
            <AlertCircle size={24} className="mr-2" />
            <h3 className="text-xl font-semibold">Delete Project</h3>
          </div>
          <p className="text-[#1E4D3A] dark:text-white mb-2">
            Are you sure you want to delete <span className="font-semibold">{project.title}</span>?
          </p>
          <p className="text-[#577B92] dark:text-gray-400 text-sm mb-4">
            This action cannot be undone. All project data, including scripts and assets, will be permanently deleted.
          </p>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-700 dark:text-red-300 text-sm">
              To confirm deletion, please type the project name:
              <span className="font-mono font-bold ml-1">{project.title}</span>
            </p>
          </div>

          <div>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setError('');
              }}
              placeholder="Type project name to confirm"
              className={`w-full px-4 py-2 rounded-lg border ${
                error 
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-200 dark:border-gray-700 dark:bg-gray-800'
              } dark:text-white focus:outline-none focus:border-red-500 dark:focus:border-red-500`}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
          <button 
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-[#577B92] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirmDelete}
            className={`px-4 py-2 rounded-lg text-white ${
              confirmationText === project.title
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-red-300 dark:bg-red-800 cursor-not-allowed'
            }`}
            disabled={confirmationText !== project.title}
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProjectDialog;