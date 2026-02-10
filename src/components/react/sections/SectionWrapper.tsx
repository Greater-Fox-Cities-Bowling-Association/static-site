import React from 'react';
import type { SectionEditorProps } from '../../../types/cms';

interface SectionWrapperProps extends Pick<SectionEditorProps, 'onDelete' | 'onMoveUp' | 'onMoveDown' | 'canMoveUp' | 'canMoveDown'> {
  type: string;
  children: React.ReactNode;
}

export default function SectionWrapper({ 
  type, 
  children, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  canMoveUp, 
  canMoveDown 
}: SectionWrapperProps) {
  const typeLabels: Record<string, string> = {
    hero: 'Hero Section',
    text: 'Text Block',
    cardGrid: 'Card Grid',
    cta: 'Call to Action',
  };

  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm mb-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <h3 className="font-semibold text-lg text-gray-900">
          {typeLabels[type] || type}
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move Up"
          >
            ↑
          </button>
          
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move Down"
          >
            ↓
          </button>
          
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            title="Delete Section"
          >
            Delete
          </button>
        </div>
      </div>
      
      {children}
    </div>
  );
}
