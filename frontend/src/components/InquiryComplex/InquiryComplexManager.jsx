import React, { useState, useEffect } from 'react';
import { Plus, Target, Brain, Lightbulb, Search, X, FileText } from 'lucide-react';
import InquiryComplexView from './InquiryComplexView';
import inquiryComplexService from '../../services/inquiryComplexService';
import projectService from '../../services/projectService';

const InquiryComplexManager = ({ content, purpose, project }) => {
  const [complexes, setComplexes] = useState([]);
  const [activeComplexId, setActiveComplexId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtractingThemes, setIsExtractingThemes] = useState(false);
  const [themeExtractionResults, setThemeExtractionResults] = useState(null);
  const [perspectiveOptions, setPerspectiveOptions] = useState(null);
  const [isGeneratingPerspectives, setIsGeneratingPerspectives] = useState(false);

  useEffect(() => {
    loadComplexes();
  }, []);

  const loadComplexes = () => {
    const allComplexes = inquiryComplexService.getAllComplexes();
    setComplexes(allComplexes);
  };

  const handleGeneratePerspectives = async () => {
    if (!newQuestion.trim()) return;

    setIsGeneratingPerspectives(true);
    try {
      const options = await inquiryComplexService.generatePerspectiveOptions(newQuestion.trim());
      setPerspectiveOptions(options);
    } catch (error) {
      console.error('Failed to generate perspectives:', error);
      alert('Failed to generate perspectives. Please try again.');
    } finally {
      setIsGeneratingPerspectives(false);
    }
  };

  const handleCreateComplex = async (selectedPerspective = null) => {
    const questionToUse = perspectiveOptions?.question || newQuestion.trim();
    if (!questionToUse) return;

    setIsCreating(true);
    try {
      const complex = await inquiryComplexService.createComplex(questionToUse, selectedPerspective);
      setComplexes(prev => [...prev, complex]);
      setActiveComplexId(complex.id);
      setShowCreateForm(false);
      setNewQuestion('');
      setPerspectiveOptions(null);
      
      // Immediately save to project with proper serialization
      if (project) {
        try {
          const allComplexes = inquiryComplexService.getAllComplexes();
          const serializedComplexes = allComplexes.map(c => inquiryComplexService.serializeComplex(c));
          await projectService.updateInquiryComplexes(project.id, serializedComplexes);
          console.log('Complex saved to project immediately after creation');
        } catch (saveError) {
          console.error('Failed to save complex to project:', saveError);
        }
      }
    } catch (error) {
      console.error('Failed to create inquiry complex:', error);
      alert('Failed to create inquiry complex. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleExpandNode = async (complexId, nodeId, expansionType) => {
    try {
      const newNodeIds = await inquiryComplexService.expandNode(complexId, nodeId, expansionType);
      loadComplexes(); // Refresh the complexes to show new nodes
      
      // Immediately save to project after expansion with proper serialization
      if (project) {
        try {
          const allComplexes = inquiryComplexService.getAllComplexes();
          const serializedComplexes = allComplexes.map(c => inquiryComplexService.serializeComplex(c));
          await projectService.updateInquiryComplexes(project.id, serializedComplexes);
          console.log('Complex saved to project after node expansion');
        } catch (saveError) {
          console.error('Failed to save expanded complex to project:', saveError);
        }
      }
      
      return newNodeIds;
    } catch (error) {
      console.error('Failed to expand node:', error);
      throw error;
    }
  };

  const handleDeleteComplex = async (complexId) => {
    if (window.confirm('Are you sure you want to delete this inquiry complex?')) {
      inquiryComplexService.deleteComplex(complexId);
      setComplexes(prev => prev.filter(c => c.id !== complexId));
      if (activeComplexId === complexId) {
        setActiveComplexId(null);
      }
      
      // Immediately save to project after deletion with proper serialization
      if (project) {
        try {
          const allComplexes = inquiryComplexService.getAllComplexes();
          const serializedComplexes = allComplexes.map(c => inquiryComplexService.serializeComplex(c));
          await projectService.updateInquiryComplexes(project.id, serializedComplexes);
          console.log('Complex deletion saved to project');
        } catch (saveError) {
          console.error('Failed to save complex deletion to project:', saveError);
        }
      }
    }
  };

  const handleAnalyzeComplex = async (complexId) => {
    setIsAnalyzing(true);
    try {
      const analysis = await inquiryComplexService.analyzeComplex(complexId);
      setAnalysisResults({ complexId, analysis });
    } catch (error) {
      console.error('Failed to analyze complex:', error);
      alert('Failed to analyze complex. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExtractThemes = async () => {
    if (!content || content.length < 200) {
      alert('You need at least 200 characters of written content to extract themes.');
      return;
    }

    // Count existing theme-based complexes
    const existingThemeComplexes = complexes.filter(c => c.metadata?.extractedTheme);
    
    setIsExtractingThemes(true);
    try {
      const extractionResults = await inquiryComplexService.extractThemesFromText(
        content, 
        purpose || 'General writing exploration', 
        5
      );
      
      setThemeExtractionResults(extractionResults);
      loadComplexes(); // Refresh to show new complexes
      
      // Immediately save to project after theme extraction with proper serialization
      if (project) {
        try {
          const allComplexes = inquiryComplexService.getAllComplexes();
          const serializedComplexes = allComplexes.map(c => inquiryComplexService.serializeComplex(c));
          await projectService.updateInquiryComplexes(project.id, serializedComplexes);
          console.log('Theme-extracted complexes saved to project');
        } catch (saveError) {
          console.error('Failed to save theme-extracted complexes to project:', saveError);
        }
      }
      
    } catch (error) {
      console.error('Failed to extract themes:', error);
      alert(`Failed to extract themes: ${error.message}`);
    } finally {
      setIsExtractingThemes(false);
    }
  };

  const activeComplex = complexes.find(c => c.id === activeComplexId);

  const sampleQuestions = [
    "Is artificial intelligence fundamentally changing what it means to be human?",
    "Should we prioritize individual freedom or collective well-being in society?",
    "Is objective moral truth possible, or is all ethics relative?",
    "What is the relationship between consciousness and physical reality?",
    "How should we balance technological progress with environmental preservation?"
  ];

  if (activeComplex) {
    return (
      <div className="h-full flex flex-col bg-obsidian-bg">
        <div className="flex items-center gap-2 px-2 py-2 bg-obsidian-surface border-b border-obsidian-border">
          <button
            onClick={() => setActiveComplexId(null)}
            className="p-1 hover:bg-obsidian-bg rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-obsidian-text-muted">Back</span>
        </div>
        
        <InquiryComplexView
          complex={activeComplex}
          onExpandNode={handleExpandNode}
          onDeleteComplex={handleDeleteComplex}
          onAnalyze={handleAnalyzeComplex}
          isAnalyzing={isAnalyzing}
        />

        {/* Analysis Results Modal */}
        {analysisResults && analysisResults.complexId === activeComplexId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="obsidian-panel p-4 max-w-2xl max-h-[80vh] overflow-auto obsidian-scrollbar">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 uppercase tracking-wide text-obsidian-text-primary">
                  <Brain className="w-3.5 h-3.5 text-obsidian-accent-primary" />
                  Analysis
                </h3>
                <button
                  onClick={() => setAnalysisResults(null)}
                  className="p-1 hover:bg-obsidian-bg rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-obsidian-bg rounded border border-obsidian-border">
                    <div className="text-xs text-obsidian-text-tertiary font-medium uppercase tracking-wide mb-1">Strength</div>
                    <div className="text-xl font-bold text-obsidian-text-primary mono">
                      {Math.round(analysisResults.analysis.overallStrength * 100)}%
                    </div>
                  </div>
                  <div className="p-2.5 bg-obsidian-bg rounded border border-obsidian-border">
                    <div className="text-xs text-obsidian-text-tertiary font-medium uppercase tracking-wide mb-1">Coherence</div>
                    <div className="text-xl font-bold text-obsidian-text-primary mono">
                      {Math.round(analysisResults.analysis.coherenceScore * 100)}%
                    </div>
                  </div>
                </div>

                {analysisResults.analysis.keyInsights && (
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wide text-obsidian-text-tertiary mb-1.5">Insights</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-obsidian-text-secondary">
                      {analysisResults.analysis.keyInsights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResults.analysis.suggestions && (
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wide text-obsidian-text-tertiary mb-1.5">Suggestions</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-obsidian-text-secondary">
                      {analysisResults.analysis.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Theme Extraction Results Modal */}
        {themeExtractionResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="obsidian-panel p-4 max-w-4xl max-h-[80vh] overflow-auto obsidian-scrollbar">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 uppercase tracking-wide text-obsidian-text-primary">
                  <FileText className="w-3.5 h-3.5 text-obsidian-accent-primary" />
                  Themes
                </h3>
                <button
                  onClick={() => setThemeExtractionResults(null)}
                  className="p-1 hover:bg-obsidian-bg rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 bg-obsidian-bg rounded border border-obsidian-border">
                    <div className="text-xs text-obsidian-text-tertiary font-medium uppercase tracking-wide mb-1">Analyzed</div>
                    <div className="text-xl font-bold text-obsidian-text-primary mono">
                      {themeExtractionResults.sourceAnalysis.contentLength}
                    </div>
                  </div>
                  <div className="p-2.5 bg-obsidian-bg rounded border border-obsidian-border">
                    <div className="text-xs text-obsidian-text-tertiary font-medium uppercase tracking-wide mb-1">Found</div>
                    <div className="text-xl font-bold text-obsidian-text-primary mono">
                      {themeExtractionResults.sourceAnalysis.extractedCount}
                    </div>
                  </div>
                  <div className="p-2.5 bg-obsidian-bg rounded border border-obsidian-border">
                    <div className="text-xs text-obsidian-text-tertiary font-medium uppercase tracking-wide mb-1">Created</div>
                    <div className="text-xl font-bold text-obsidian-text-primary mono">
                      {themeExtractionResults.themes.length}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-obsidian-text-tertiary mb-2">Extracted Themes</h4>
                  <div className="space-y-2">
                    {themeExtractionResults.themes.map((themeResult, index) => (
                      <div key={index} className="obsidian-card p-3">
                        <div className="flex items-start justify-between mb-1.5">
                          <h5 className="font-medium text-obsidian-text-primary text-sm">
                            {themeResult.theme.title}
                          </h5>
                          <span className="stat-badge">
                            {Math.round(themeResult.theme.significance * 100)}%
                          </span>
                        </div>

                        <p className="text-xs text-obsidian-text-secondary mb-2">
                          {themeResult.theme.description}
                        </p>

                        <div className="mb-2">
                          <div className="text-xs font-medium text-obsidian-text-tertiary uppercase tracking-wide mb-0.5">Question</div>
                          <div className="text-xs italic text-obsidian-accent-primary">
                            "{themeResult.theme.question}"
                          </div>
                        </div>

                        {themeResult.theme.textReferences && themeResult.theme.textReferences.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-obsidian-text-tertiary uppercase tracking-wide mb-1">References</div>
                            <div className="flex flex-wrap gap-1">
                              {themeResult.theme.textReferences.map((ref, refIndex) => (
                                <span key={refIndex} className="text-xs px-1.5 py-0.5 bg-obsidian-bg text-obsidian-text-secondary rounded border border-obsidian-border">
                                  "{ref.length > 50 ? ref.substring(0, 47) + '...' : ref}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-obsidian-border">
                          <button
                            onClick={() => {
                              setActiveComplexId(themeResult.complex.id);
                              setThemeExtractionResults(null);
                            }}
                            className="text-xs px-2.5 py-1 obsidian-button-primary"
                          >
                            Explore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-obsidian-bg">
      {/* Header */}
      <div className="bg-obsidian-surface border-b border-obsidian-border px-2 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-obsidian-text-primary">Inquiry</h1>
            <p className="text-xs text-obsidian-text-muted mt-0.5 mono">{complexes.length} complexes</p>
          </div>

          <div className="flex items-center gap-2">
            {content && content.length >= 200 && (() => {
              const existingThemeCount = complexes.filter(c => c.metadata?.extractedTheme).length;
              return (
                <button
                  onClick={handleExtractThemes}
                  disabled={isExtractingThemes}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isExtractingThemes ? (
                    <Brain className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  {isExtractingThemes ? 'Extracting...' :
                   existingThemeCount > 0 ? `Themes (${existingThemeCount})` : 'Extract'}
                </button>
              );
            })()}

            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 obsidian-button-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="border rounded p-3 bg-obsidian-bg">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-obsidian-text-tertiary mb-1.5 uppercase tracking-wide">
                  Question
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter a thought-provoking question..."
                  className="obsidian-input w-full h-20 resize-none obsidian-scrollbar text-sm"
                />
              </div>

              <div>
                <div className="text-xs text-obsidian-text-muted mb-1.5">Examples:</div>
                <div className="flex flex-wrap gap-1.5">
                  {sampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setNewQuestion(question)}
                      className="text-xs px-2 py-1 bg-obsidian-accent-pale text-obsidian-accent-primary rounded hover:bg-obsidian-accent-light/30 transition-colors"
                    >
                      {question.length > 50 ? question.substring(0, 47) + '...' : question}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {!perspectiveOptions ? (
                  <>
                    <button
                      onClick={handleGeneratePerspectives}
                      disabled={!newQuestion.trim() || isGeneratingPerspectives}
                      className="flex items-center gap-1.5 obsidian-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingPerspectives ? (
                        <Brain className="w-3.5 h-3.5 animate-pulse" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      {isGeneratingPerspectives ? 'Generating...' : 'Generate'}
                    </button>

                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewQuestion('');
                      }}
                      className="px-3 py-1.5 text-sm text-obsidian-text-secondary hover:text-obsidian-text-primary hover:bg-obsidian-surface rounded"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setPerspectiveOptions(null);
                    }}
                    className="px-3 py-1.5 text-sm text-obsidian-text-secondary hover:text-obsidian-text-primary hover:bg-obsidian-surface rounded"
                  >
                    ← Back
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Perspective Selection */}
        {perspectiveOptions && (
          <div className="border border-obsidian-border rounded p-3 bg-obsidian-bg mt-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 uppercase tracking-wide text-obsidian-text-primary">
              <Target className="w-3.5 h-3.5 text-obsidian-accent-primary" />
              Perspectives
            </h3>
            <p className="text-xs text-obsidian-text-secondary mb-3">
              Select a position to explore: "{perspectiveOptions.question}"
            </p>

            <div className="space-y-2">
              {perspectiveOptions.perspectives.map((perspective, index) => (
                <div
                  key={perspective.id}
                  className="obsidian-card p-3 hover:border-obsidian-border-focus transition-colors cursor-pointer"
                  onClick={() => handleCreateComplex(perspective)}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="font-medium text-obsidian-text-primary text-sm">
                      {perspective.perspective}
                    </h4>
                    <span className="stat-badge">
                      {Math.round(perspective.strength * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-obsidian-text-secondary mb-1.5">
                    {perspective.content}
                  </p>

                  <div className="text-xs text-obsidian-text-muted">
                    <span className="font-medium">Reasoning:</span> {perspective.reasoning}
                  </div>

                  {perspective.tags && perspective.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {perspective.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="text-xs px-1.5 py-0.5 bg-obsidian-bg text-obsidian-text-tertiary rounded border border-obsidian-border">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-obsidian-border">
                    <button
                      disabled={isCreating}
                      className="text-xs px-2.5 py-1 obsidian-button-primary disabled:opacity-50"
                    >
                      {isCreating ? 'Creating...' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complex List */}
      <div className="flex-1 overflow-auto p-2 obsidian-scrollbar">
        {complexes.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-8 h-8 text-obsidian-border mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-obsidian-text-primary mb-1">No complexes</h3>
            <p className="text-xs text-obsidian-text-muted mb-4">
              Create your first inquiry complex
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 obsidian-button-primary text-xs mx-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {complexes.map((complex) => (
              <div
                key={complex.id}
                className={`obsidian-card p-3 cursor-pointer group ${
                  complex.metadata?.extractedTheme
                    ? 'border-green-200 bg-green-50/30'
                    : ''
                }`}
                onClick={() => setActiveComplexId(complex.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {complex.metadata?.extractedTheme ? (
                      <FileText className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-obsidian-accent-primary flex-shrink-0" />
                    )}
                    {complex.metadata?.extractedTheme && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                        Theme
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-obsidian-text-muted mono">
                    {new Date(complex.metadata.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="text-sm font-medium text-obsidian-text-primary mb-1.5 line-clamp-2 leading-tight">
                  {complex.centralQuestion}
                </h3>

                {complex.metadata?.extractedTheme && (
                  <div className="text-xs text-green-700 mb-1.5 italic line-clamp-1">
                    "{complex.metadata.extractedTheme.title}"
                  </div>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <span className="stat-badge">
                    <span>{complex.nodes.size}</span>
                    <span>nodes</span>
                  </span>
                  <span className="stat-badge">
                    <span>D{complex.metadata.maxDepth}</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {Object.entries(complex.metadata.explorationStats.nodesByType).map(([type, count]) => (
                    count > 0 && (
                      <span key={type} className={`text-xs px-1.5 py-0.5 rounded ${
                        type === 'point' ? 'bg-blue-100/50 text-blue-700' :
                        type === 'objection' ? 'bg-red-100/50 text-red-700' :
                        type === 'synthesis' ? 'bg-green-100/50 text-green-700' :
                        'bg-orange-100/50 text-orange-700'
                      }`}>
                        {count}
                      </span>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InquiryComplexManager;