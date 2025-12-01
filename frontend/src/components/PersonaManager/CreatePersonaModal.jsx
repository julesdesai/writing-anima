import React, { useState, useEffect } from 'react';
import { X, Cpu } from 'lucide-react';
import animaService from '../../services/animaService';

const CreatePersonaModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5');
  const [availableModels, setAvailableModels] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Fetch available models when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingModels(true);
      animaService.getAvailableModels()
        .then(models => {
          setAvailableModels(models);
          // Set default to first model if available
          if (models.length > 0 && !selectedModel) {
            setSelectedModel(models[0].id);
          }
        })
        .catch(error => {
          console.error('Error fetching models:', error);
          // Fallback to default models if API fails
          setAvailableModels([
            { id: 'gpt-5', name: 'GPT-5', provider: 'openai', description: 'OpenAI\'s most advanced model' },
            { id: 'kimi-k2', name: 'Kimi K2', provider: 'moonshot', description: 'Moonshot\'s flagship model' }
          ]);
        })
        .finally(() => setIsLoadingModels(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a persona name');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || null,
        model: selectedModel
      });

      // Reset form
      setName('');
      setDescription('');
      setSelectedModel('gpt-5');
    } catch (error) {
      console.error('Error creating persona:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Persona</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Persona Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Hemingway, Academic Writer, Technical Documentation"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={100}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Choose a descriptive name for this writing style
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Short, direct sentences with minimal adjectives"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional description of the writing style
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Cpu className="w-4 h-4 inline mr-1" />
              AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={isLoadingModels}
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : (
                availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              )}
            </select>
            {/* Model description */}
            {!isLoadingModels && availableModels.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {availableModels.find(m => m.id === selectedModel)?.description || ''}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Persona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePersonaModal;
