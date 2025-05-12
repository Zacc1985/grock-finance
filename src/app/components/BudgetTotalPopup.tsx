import { useState } from 'react';
import { PencilIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface BudgetTotalPopupProps {
  label: string;
  currentAmount: number;
  targetAmount: number;
  onUpdate: (newAmount: number) => void;
  onReset: () => void;
  type: 'needs' | 'wants' | 'savings';
}

export default function BudgetTotalPopup({
  label,
  currentAmount,
  targetAmount,
  onUpdate,
  onReset,
  type
}: BudgetTotalPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentAmount.toString());

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(currentAmount.toString());
  };

  const handleSave = () => {
    const newAmount = parseFloat(editValue);
    if (!isNaN(newAmount) && newAmount >= 0) {
      onUpdate(newAmount);
    }
    setIsEditing(false);
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  const getTypeColor = () => {
    switch (type) {
      case 'needs':
        return 'text-blue-600';
      case 'wants':
        return 'text-purple-600';
      case 'savings':
        return 'text-green-600';
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
      >
        <span className={`font-medium ${getTypeColor()}`}>{label}</span>
        <span className="text-gray-900">
          ${currentAmount.toFixed(2)} / ${targetAmount.toFixed(2)}
        </span>
      </button>

      {/* Popup Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900">Adjust {label}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    New Amount
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleEdit}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Amount
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Reset to Default
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 