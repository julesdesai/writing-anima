import React from 'react';
import { Target, Brain, Palette, Send, Loader2, Lightbulb } from 'lucide-react';

const PurposeStep = ({ purpose, setPurpose, onSubmit }) => {
  // Handle both old format (string) and new format (object with topic/context)
  const purposeData = typeof purpose === 'string' ? { topic: purpose, context: '' } : purpose;
  
  const handleSubmit = () => {
    if (!purposeData.topic?.trim()) return;
    onSubmit(purposeData);
  };
  
  const updatePurpose = (field, value) => {
    setPurpose(prev => {
      const current = typeof prev === 'string' ? { topic: prev, context: '' } : prev;
      return { ...current, [field]: value };
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-bg flex items-center justify-center p-2">
      <div className="max-w-2xl w-full">
        <div className="mb-8">
  
        </div>

        <div className="obsidian-panel p-4">
          <div className="space-y-4">
            <div>
              <textarea
                value={purposeData.topic || ''}
                onChange={(e) => updatePurpose('topic', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What are you writing about?"
                className="obsidian-input w-full h-20 resize-none obsidian-scrollbar text-sm"
              />
            </div>

            <div>
              <textarea
                value={purposeData.context || ''}
                onChange={(e) => updatePurpose('context', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Who's your audience? What's the setting?"
                className="obsidian-input w-full h-20 resize-none obsidian-scrollbar text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-obsidian-text-muted">
              <kbd className="px-1.5 py-0.5 bg-obsidian-bg rounded text-xs mono border border-obsidian-border">Ctrl+Enter</kbd>
            </p>
            <button
              onClick={handleSubmit}
              disabled={!purposeData.topic?.trim()}
              className={`p-2 rounded transition-colors ${
                !purposeData.topic?.trim()
                  ? 'text-obsidian-text-muted cursor-not-allowed'
                  : 'text-obsidian-accent-primary hover:bg-obsidian-accent-pale'
              }`}
              title="Continue to editor"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurposeStep;