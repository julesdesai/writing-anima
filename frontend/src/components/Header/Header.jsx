import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Header = ({ 
  purpose,
  onBackToPurpose
}) => {
  return (
    <div className="bg-obsidian-surface border-b border-obsidian-border px-2 py-3 shadow-obsidian-sm">
      <div className="mx-auto flex items-center gap-4">
        <button
          onClick={onBackToPurpose}
          className="flex items-center gap-2 px-3 py-2 text-obsidian-text-secondary hover:text-obsidian-text-primary hover:bg-obsidian-bg rounded-obsidian transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div>
          <p className="text-sm text-obsidian-text-secondary max-w-2xl">
            {typeof purpose === 'object' && purpose !== null ? (
              <>
                {purpose.topic}
                {purpose.context && (
                  <>
                    {' • '}
                    {purpose.context}
                  </>
                )}
              </>
            ) : (
              <>{purpose}</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Header;