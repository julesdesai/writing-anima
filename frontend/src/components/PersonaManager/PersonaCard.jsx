import React, { useState } from 'react';
import { Upload, Trash2, FileText, Database, Cpu, Check } from 'lucide-react';

const PersonaCard = ({ persona, onUpload, onDelete, onModelChange, availableModels = [] }) => {
  const hasCorpus = persona.chunk_count > 0;
  const [isChangingModel, setIsChangingModel] = useState(false);
  const currentModel = persona.model || 'gpt-5';

  const handleModelChange = async (e) => {
    const newModel = e.target.value;
    if (newModel === currentModel) return;

    setIsChangingModel(true);
    try {
      await onModelChange(persona.id, newModel);
    } catch (error) {
      console.error('Failed to change model:', error);
    } finally {
      setIsChangingModel(false);
    }
  };

  return (
    <div className="obsidian-card group">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-obsidian-text-primary mb-0.5 truncate">{persona.name}</h3>
            {persona.description && (
              <p className="text-xs text-obsidian-text-secondary line-clamp-2 leading-tight">{persona.description}</p>
            )}
          </div>
          <button
            onClick={() => onDelete(persona.id)}
            className="p-1 text-obsidian-text-muted hover:text-red-600 hover:bg-red-50/50 rounded transition-colors opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-2">
          <div className="stat-badge">
            <FileText className="w-3 h-3" />
            <span>{persona.corpus_file_count}</span>
          </div>
          <div className="stat-badge">
            <Database className="w-3 h-3" />
            <span>{persona.chunk_count.toLocaleString()}</span>
          </div>
          {hasCorpus ? (
            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100/50 text-green-700 border border-green-300">
              Ready
            </span>
          ) : (
            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100/50 text-yellow-700 border border-yellow-300">
              Empty
            </span>
          )}
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-1 mb-2">
          <Cpu className="w-3 h-3 text-purple-600" />
          <select
            value={currentModel}
            onChange={handleModelChange}
            disabled={isChangingModel}
            className="text-xs font-medium bg-purple-100/50 text-purple-700 border border-purple-300 rounded px-1.5 py-0.5 cursor-pointer hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            {availableModels.length > 0 ? (
              availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))
            ) : (
              <>
                <option value="gpt-5">GPT-5</option>
                <option value="kimi-k2">Kimi K2</option>
              </>
            )}
          </select>
          {isChangingModel && (
            <span className="text-xs text-purple-600 animate-pulse">Saving...</span>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onUpload(persona)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-obsidian-accent-pale text-obsidian-accent-primary rounded hover:bg-obsidian-accent-light/30 transition-colors text-xs font-medium"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{hasCorpus ? 'Add Files' : 'Upload'}</span>
        </button>

        {/* Metadata */}
        <div className="mt-2 pt-2 border-t border-obsidian-border">
          <p className="text-xs text-obsidian-text-muted mono">
            {new Date(persona.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PersonaCard;
