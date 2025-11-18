import React from 'react';
import { Search, Lightbulb, CheckCircle, Loader2 } from 'lucide-react';

/**
 * Displays the internal thought process of Anima analysis
 * Minimal inline display similar to Claude Code's thinking fragments
 */
const ThoughtProcess = ({ steps, isAnalyzing }) => {
  if (!steps || steps.length === 0) {
    return null;
  }

  // Show only the most recent step
  const latestStep = steps[steps.length - 1];

  const getStepIcon = (step) => {
    if (step.type === 'search') {
      return <Search className="w-3.5 h-3.5 text-obsidian-accent-primary" />;
    } else if (step.type === 'generate') {
      return <Lightbulb className="w-3.5 h-3.5 text-obsidian-warning" />;
    } else if (step.type === 'complete') {
      return <CheckCircle className="w-3.5 h-3.5 text-obsidian-success" />;
    } else {
      return <Loader2 className="w-3.5 h-3.5 text-obsidian-text-tertiary animate-spin" />;
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-obsidian-accent-pale/30 border-l-2 border-obsidian-accent-primary rounded-obsidian text-sm text-obsidian-text-secondary">
      <div className="flex-shrink-0">
        {getStepIcon(latestStep)}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-obsidian-text-primary">{latestStep.message}</span>
        {latestStep.details && (
          <span className="text-obsidian-text-tertiary ml-2 font-mono text-xs">
            {latestStep.details}
          </span>
        )}
      </div>
      {steps.length > 1 && (
        <span className="text-xs text-obsidian-text-muted flex-shrink-0">
          {steps.length} steps
        </span>
      )}
    </div>
  );
};

export default ThoughtProcess;
