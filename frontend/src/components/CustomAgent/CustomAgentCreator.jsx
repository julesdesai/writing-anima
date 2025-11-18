/**
 * Custom Agent Creator - UI for creating and configuring dynamic agents
 * Allows users to create agents from templates or build completely custom agents
 */

import React, { useState, useEffect } from 'react';
import { 
  AGENT_TEMPLATES, 
  AGENT_CATEGORIES, 
  PERSONA_TYPES, 
  OUTPUT_FORMATS,
  getTemplatesByCategory,
  getRecommendedTemplates,
  searchTemplates
} from '../../agents/AgentTemplates';
import { MODEL_TIERS, CAPABILITIES } from '../../agents/BaseAgent';

export const CustomAgentCreator = ({ 
  isOpen, 
  onClose, 
  onCreateAgent, 
  onUpdateAgent,
  editingAgent = null,
  userPreferences = {},
  existingAgents = []
}) => {
  const [step, setStep] = useState(1); // 1: Template Selection, 2: Configuration, 3: Review
  const [creationMode, setCreationMode] = useState('template'); // 'template' or 'custom'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Agent configuration state
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    description: '',
    specialization: '',
    customPrompt: '',
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [],
    focusAreas: [],
    outputFormat: OUTPUT_FORMATS.STANDARD,
    persona: PERSONA_TYPES.NEUTRAL,
    userSettings: {
      escalationThreshold: 0.75,
      maxRetries: 2,
      maxTokens: 2000
    }
  });

  const [errors, setErrors] = useState({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Initialize for editing
  useEffect(() => {
    if (editingAgent) {
      setAgentConfig({
        name: editingAgent.name || '',
        description: editingAgent.description || '',
        specialization: editingAgent.specialization || '',
        customPrompt: editingAgent.customPrompt || '',
        modelTier: editingAgent.modelTier || MODEL_TIERS.STANDARD,
        capabilities: editingAgent.capabilities || [],
        focusAreas: editingAgent.focusAreas || [],
        outputFormat: editingAgent.outputFormat || OUTPUT_FORMATS.STANDARD,
        persona: editingAgent.persona || PERSONA_TYPES.NEUTRAL,
        userSettings: editingAgent.userSettings || {
          escalationThreshold: 0.75,
          maxRetries: 2,
          maxTokens: 2000
        }
      });
      setCreationMode('custom');
      setStep(2);
    }
  }, [editingAgent]);

  // Get filtered templates
  const getFilteredTemplates = () => {
    let templates = Object.entries(AGENT_TEMPLATES);
    
    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter(([key, template]) => template.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const searchResults = searchTemplates(searchQuery);
      templates = templates.filter(([key]) => searchResults[key]);
    }
    
    return templates;
  };

  // Get recommended templates
  const getRecommended = () => {
    return Object.entries(getRecommendedTemplates(userPreferences)).slice(0, 3);
  };

  // Handle template selection
  const handleTemplateSelect = (templateKey) => {
    const template = AGENT_TEMPLATES[templateKey];
    setSelectedTemplate(templateKey);
    setAgentConfig({
      ...template,
      name: template.name,
      userSettings: {
        escalationThreshold: 0.75,
        maxRetries: 2,
        maxTokens: 2000
      }
    });
    setStep(2);
  };

  // Handle configuration changes
  const handleConfigChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setAgentConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setAgentConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle focus area changes
  const handleFocusAreaChange = (index, value) => {
    const newFocusAreas = [...agentConfig.focusAreas];
    newFocusAreas[index] = value;
    setAgentConfig(prev => ({ ...prev, focusAreas: newFocusAreas }));
  };

  const addFocusArea = () => {
    setAgentConfig(prev => ({
      ...prev,
      focusAreas: [...prev.focusAreas, '']
    }));
  };

  const removeFocusArea = (index) => {
    setAgentConfig(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.filter((_, i) => i !== index)
    }));
  };

  // Validation
  const validateConfig = () => {
    const newErrors = {};
    
    if (!agentConfig.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (agentConfig.name.length > 100) {
      newErrors.name = 'Agent name must be under 100 characters';
    }
    
    if (!agentConfig.specialization.trim()) {
      newErrors.specialization = 'Specialization is required';
    }
    
    if (!agentConfig.customPrompt.trim()) {
      newErrors.customPrompt = 'Custom prompt is required';
    } else if (agentConfig.customPrompt.length > 2000) {
      newErrors.customPrompt = 'Custom prompt must be under 2000 characters';
    }
    
    if (agentConfig.description && agentConfig.description.length > 500) {
      newErrors.description = 'Description must be under 500 characters';
    }
    
    // Check for duplicate names
    const isDuplicate = existingAgents.some(agent => 
      agent.name.toLowerCase() === agentConfig.name.toLowerCase() && 
      (!editingAgent || agent.agentId !== editingAgent.agentId)
    );
    
    if (isDuplicate) {
      newErrors.name = 'An agent with this name already exists';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle creation/update
  const handleSubmit = () => {
    if (!validateConfig()) return;
    
    if (editingAgent) {
      onUpdateAgent(editingAgent.agentId, agentConfig);
    } else {
      onCreateAgent(agentConfig);
    }
    
    onClose();
  };

  // Reset form
  const handleReset = () => {
    setStep(1);
    setCreationMode('template');
    setSelectedTemplate(null);
    setSearchQuery('');
    setSelectedCategory('all');
    setAgentConfig({
      name: '',
      description: '',
      specialization: '',
      customPrompt: '',
      modelTier: MODEL_TIERS.STANDARD,
      capabilities: [],
      focusAreas: [],
      outputFormat: OUTPUT_FORMATS.STANDARD,
      persona: PERSONA_TYPES.NEUTRAL,
      userSettings: {
        escalationThreshold: 0.75,
        maxRetries: 2,
        maxTokens: 2000
      }
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingAgent ? 'Edit Custom Agent' : 'Create Custom Agent'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 && 'Choose a template or start from scratch'}
              {step === 2 && 'Configure your agent\'s behavior and specialization'}
              {step === 3 && 'Review and create your custom agent'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Progress Indicator */}
        {!editingAgent && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map(stepNum => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNum}
                  </div>
                  <span className={`ml-2 text-sm ${
                    step >= stepNum ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {stepNum === 1 && 'Template'}
                    {stepNum === 2 && 'Configure'}
                    {stepNum === 3 && 'Review'}
                  </span>
                  {stepNum < 3 && <div className="w-8 h-0.5 bg-gray-200 ml-4" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Template Selection */}
        {step === 1 && !editingAgent && (
          <div className="p-6">
            
            {/* Creation Mode Selection */}
            <div className="mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setCreationMode('template')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    creationMode === 'template'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Start from Template
                </button>
                <button
                  onClick={() => {
                    setCreationMode('custom');
                    setStep(2);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    creationMode === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Create from Scratch
                </button>
              </div>
            </div>

            {/* Template Selection */}
            {creationMode === 'template' && (
              <div>
                {/* Search and Filter */}
                <div className="mb-6 space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedCategory === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      All Categories
                    </button>
                    {Object.values(AGENT_CATEGORIES).map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                          selectedCategory === category
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommended Templates */}
                {searchQuery === '' && selectedCategory === 'all' && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Recommended for You
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {getRecommended().map(([key, template]) => (
                        <TemplateCard
                          key={key}
                          templateKey={key}
                          template={template}
                          isRecommended={true}
                          onSelect={handleTemplateSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Templates */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    {searchQuery || selectedCategory !== 'all' ? 'Results' : 'All Templates'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFilteredTemplates().map(([key, template]) => (
                      <TemplateCard
                        key={key}
                        templateKey={key}
                        template={template}
                        onSelect={handleTemplateSelect}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={agentConfig.name}
                    onChange={(e) => handleConfigChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter agent name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={agentConfig.description}
                    onChange={(e) => handleConfigChange('description', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe what this agent does..."
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    value={agentConfig.specialization}
                    onChange={(e) => handleConfigChange('specialization', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.specialization ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="What does this agent specialize in?"
                  />
                  {errors.specialization && <p className="text-red-500 text-sm mt-1">{errors.specialization}</p>}
                </div>

                {/* Focus Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Focus Areas
                  </label>
                  <div className="space-y-2">
                    {agentConfig.focusAreas.map((area, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={area}
                          onChange={(e) => handleFocusAreaChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Focus area"
                        />
                        <button
                          onClick={() => removeFocusArea(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addFocusArea}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      + Add Focus Area
                    </button>
                  </div>
                </div>
              </div>

              {/* Configuration Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Configuration</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Tier
                  </label>
                  <select
                    value={agentConfig.modelTier}
                    onChange={(e) => handleConfigChange('modelTier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={MODEL_TIERS.FAST}>Fast (gpt-4o-mini) - Quick responses</option>
                    <option value={MODEL_TIERS.STANDARD}>Standard (gpt-4o) - Balanced performance</option>
                    <option value={MODEL_TIERS.PREMIUM}>Premium (gpt-4) - Highest quality</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Format
                  </label>
                  <select
                    value={agentConfig.outputFormat}
                    onChange={(e) => handleConfigChange('outputFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={OUTPUT_FORMATS.STANDARD}>Standard</option>
                    <option value={OUTPUT_FORMATS.DETAILED}>Detailed</option>
                    <option value={OUTPUT_FORMATS.BULLET_POINTS}>Bullet Points</option>
                    <option value={OUTPUT_FORMATS.CONVERSATIONAL}>Conversational</option>
                    <option value={OUTPUT_FORMATS.CHECKLIST}>Checklist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persona
                  </label>
                  <select
                    value={agentConfig.persona}
                    onChange={(e) => handleConfigChange('persona', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={PERSONA_TYPES.NEUTRAL}>Neutral</option>
                    <option value={PERSONA_TYPES.FRIENDLY}>Friendly</option>
                    <option value={PERSONA_TYPES.ACADEMIC}>Academic</option>
                    <option value={PERSONA_TYPES.CREATIVE}>Creative</option>
                    <option value={PERSONA_TYPES.PROFESSIONAL}>Professional</option>
                    <option value={PERSONA_TYPES.CRITICAL}>Critical</option>
                  </select>
                </div>

                {/* Advanced Settings */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Advanced Settings</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Escalation Threshold
                      </label>
                      <input
                        type="range"
                        min="0.4"
                        max="0.9"
                        step="0.05"
                        value={agentConfig.userSettings.escalationThreshold}
                        onChange={(e) => handleConfigChange('userSettings.escalationThreshold', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>More escalations</span>
                        <span>{agentConfig.userSettings.escalationThreshold}</span>
                        <span>Fewer escalations</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Retries
                      </label>
                      <select
                        value={agentConfig.userSettings.maxRetries}
                        onChange={(e) => handleConfigChange('userSettings.maxRetries', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Prompt *
              </label>
              <textarea
                value={agentConfig.customPrompt}
                onChange={(e) => handleConfigChange('customPrompt', e.target.value)}
                rows={8}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                  errors.customPrompt ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter the custom prompt that defines how this agent analyzes content..."
              />
              <div className="flex justify-between items-center mt-1">
                {errors.customPrompt && <p className="text-red-500 text-sm">{errors.customPrompt}</p>}
                <p className="text-xs text-gray-500 ml-auto">
                  {agentConfig.customPrompt.length}/2000 characters
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Agent</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div><strong>Name:</strong> {agentConfig.name}</div>
              <div><strong>Specialization:</strong> {agentConfig.specialization}</div>
              <div><strong>Description:</strong> {agentConfig.description || 'No description provided'}</div>
              <div><strong>Model Tier:</strong> {agentConfig.modelTier}</div>
              <div><strong>Output Format:</strong> {agentConfig.outputFormat}</div>
              <div><strong>Persona:</strong> {agentConfig.persona}</div>
              {agentConfig.focusAreas.length > 0 && (
                <div><strong>Focus Areas:</strong> {agentConfig.focusAreas.join(', ')}</div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Prompt Preview
              </label>
              <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono max-h-40 overflow-y-auto">
                {agentConfig.customPrompt}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            {step > 1 && !editingAgent && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Back
              </button>
            )}
            <button
              onClick={editingAgent ? onClose : handleReset}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
            >
              {editingAgent ? 'Cancel' : 'Reset'}
            </button>
          </div>

          <div className="flex space-x-3">
            {step === 2 && !editingAgent && (
              <button
                onClick={() => setStep(3)}
                disabled={!validateConfig()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Review
              </button>
            )}
            {(step === 3 || editingAgent) && (
              <button
                onClick={handleSubmit}
                disabled={!validateConfig()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {editingAgent ? 'Update Agent' : 'Create Agent'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Template Card Component
const TemplateCard = ({ templateKey, template, isRecommended = false, onSelect }) => {
  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
      onClick={() => onSelect(templateKey)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{template.icon}</span>
          <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
        </div>
        {isRecommended && (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
            Recommended
          </span>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {template.description}
      </p>
      
      <div className="flex items-center justify-between text-xs">
        <span className={`px-2 py-1 rounded-full font-medium ${
          template.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
          template.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {template.difficulty}
        </span>
        <span className="text-gray-500 capitalize">{template.category}</span>
      </div>
    </div>
  );
};

export default CustomAgentCreator;