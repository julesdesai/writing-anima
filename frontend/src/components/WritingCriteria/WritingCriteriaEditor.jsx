import React, { useState, useEffect } from 'react';
import { Plus, X, Check, Edit3, Loader, ChevronDown, ChevronRight } from 'lucide-react';
import dynamicCriteriaService from '../../services/dynamicCriteriaService';

const WritingCriteriaEditor = ({ purpose, onCriteriaChange, initialCriteria = null }) => {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    contentIdeas: true,
    structureOrganization: true,
    styleVoice: false,
    technicalQuality: false,
    audienceEngagement: false
  });
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [newCriterionText, setNewCriterionText] = useState('');
  const [addingToCategory, setAddingToCategory] = useState(null);

  const categoryInfo = {
    contentIdeas: {
      title: 'Content & Ideas',
      description: 'What should the content achieve?',
      icon: '💡',
      color: 'blue'
    },
    structureOrganization: {
      title: 'Structure & Organization',
      description: 'How should it be organized?',
      icon: '🏗️',
      color: 'green'
    },
    styleVoice: {
      title: 'Style & Voice',
      description: 'What tone and style are appropriate?',
      icon: '🎨',
      color: 'purple'
    },
    technicalQuality: {
      title: 'Technical Quality',
      description: 'What technical aspects matter?',
      icon: '⚙️',
      color: 'orange'
    },
    audienceEngagement: {
      title: 'Audience Engagement',
      description: 'How should it connect with readers?',
      icon: '👥',
      color: 'indigo'
    }
  };

  const priorityInfo = {
    high: { label: 'Essential', icon: '🔥', color: 'red' },
    medium: { label: 'Important', icon: '⚡', color: 'yellow' },
    low: { label: 'Nice to have', icon: '💡', color: 'gray' }
  };

  useEffect(() => {
    if (purpose && !initialCriteria) {
      generateCriteria();
    }
  }, [purpose]);

  const generateCriteria = async () => {
    if (!purpose) return;

    setIsGenerating(true);
    try {
      const generated = await dynamicCriteriaService.generateCriteria(purpose);
      setCriteria(generated);
      if (onCriteriaChange) {
        onCriteriaChange(generated);
      }
    } catch (error) {
      console.error('Failed to generate criteria:', error);
      // Show error state or fallback
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleCriterion = (category, criterionId) => {
    const updated = dynamicCriteriaService.toggleCriterion(criteria, category, criterionId);
    setCriteria(updated);
    if (onCriteriaChange) {
      onCriteriaChange(updated);
    }
  };

  const removeCriterion = (category, criterionId) => {
    const updated = dynamicCriteriaService.removeCriterion(criteria, category, criterionId);
    setCriteria(updated);
    if (onCriteriaChange) {
      onCriteriaChange(updated);
    }
  };

  const addCriterion = (category) => {
    if (!newCriterionText.trim()) return;

    const updated = dynamicCriteriaService.addCriterion(criteria, category, newCriterionText.trim());
    setCriteria(updated);
    setNewCriterionText('');
    setAddingToCategory(null);
    if (onCriteriaChange) {
      onCriteriaChange(updated);
    }
  };

  const updateCriterion = (category, criterionId, newText) => {
    const updated = {
      ...criteria,
      [category]: criteria[category].map(item =>
        item.id === criterionId ? { ...item, criterion: newText } : item
      )
    };
    setCriteria(updated);
    setEditingCriterion(null);
    if (onCriteriaChange) {
      onCriteriaChange(updated);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'text-red-600 bg-red-50 border-red-200',
      medium: 'text-amber-600 bg-amber-50 border-amber-200',
      low: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[priority] || colors.medium;
  };

  const getCategoryColor = (color) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      purple: 'border-purple-200 bg-purple-50',
      orange: 'border-orange-200 bg-orange-50',
      indigo: 'border-indigo-200 bg-indigo-50'
    };
    return colors[color] || colors.blue;
  };

  if (isGenerating) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Thinking about your writing...</span>
        </div>
      </div>
    );
  }

  if (!criteria) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">No criteria generated yet</div>
          <button
            onClick={generateCriteria}
            disabled={!purpose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Quality Criteria
          </button>
        </div>
      </div>
    );
  }

  const summary = dynamicCriteriaService.getCriteriaSummary(criteria);

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Writing Quality Criteria</h2>
          <button
            onClick={generateCriteria}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Edit3 className="w-4 h-4" />
            Regenerate
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Customize the criteria your AI critics will use to evaluate your writing.
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{summary.enabled} of {summary.total} criteria enabled</span>
          <span>•</span>
          <span>{summary.byPriority.high} essential</span>
          <span>{summary.byPriority.medium} important</span>
          <span>{summary.byPriority.low} optional</span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {Object.entries(categoryInfo).map(([categoryKey, categoryData]) => {
          const items = criteria[categoryKey] || [];
          const isExpanded = expandedCategories[categoryKey];
          const enabledCount = items.filter(item => item.enabled).length;

          return (
            <div
              key={categoryKey}
              className={`border rounded-lg ${getCategoryColor(categoryData.color)}`}
            >
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="w-full p-4 flex items-center justify-between hover:bg-opacity-75 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{categoryData.icon}</span>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-800">{categoryData.title}</h3>
                    <p className="text-sm text-gray-600">{categoryData.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    {enabledCount}/{items.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 bg-white rounded border transition-all ${
                        item.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleCriterion(categoryKey, item.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      
                      <div className="flex-1">
                        {editingCriterion === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              defaultValue={item.criterion}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateCriterion(categoryKey, item.id, e.target.value);
                                } else if (e.key === 'Escape') {
                                  setEditingCriterion(null);
                                }
                              }}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => setEditingCriterion(null)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingCriterion(item.id)}
                            className="cursor-pointer hover:text-blue-600 transition-colors"
                          >
                            <span className="text-sm text-gray-800">{item.criterion}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(item.priority)}`}>
                          {priorityInfo[item.priority]?.icon} {priorityInfo[item.priority]?.label}
                        </span>
                        
                        <button
                          onClick={() => removeCriterion(categoryKey, item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {addingToCategory === categoryKey ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-dashed border-gray-300">
                      <input
                        type="text"
                        value={newCriterionText}
                        onChange={(e) => setNewCriterionText(e.target.value)}
                        placeholder="Enter new criterion..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addCriterion(categoryKey);
                          } else if (e.key === 'Escape') {
                            setAddingToCategory(null);
                            setNewCriterionText('');
                          }
                        }}
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => addCriterion(categoryKey)}
                        disabled={!newCriterionText.trim()}
                        className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-400"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setAddingToCategory(null);
                          setNewCriterionText('');
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToCategory(categoryKey)}
                      className="flex items-center gap-2 p-3 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded border border-dashed border-gray-300 transition-colors w-full"
                    >
                      <Plus className="w-4 h-4" />
                      Add custom criterion
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WritingCriteriaEditor;