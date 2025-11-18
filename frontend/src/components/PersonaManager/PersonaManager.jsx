import React, { useState, useEffect, useCallback } from 'react';
import { User, Plus, Upload, Trash2, FileText, AlertCircle } from 'lucide-react';
import PersonaCard from './PersonaCard';
import CreatePersonaModal from './CreatePersonaModal';
import CorpusUploadModal from './CorpusUploadModal';
import { useAuth } from '../../contexts/AuthContext';

const PersonaManager = () => {
  const { currentUser } = useAuth();
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPersonas = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/personas?user_id=${currentUser.uid}`);

      if (!response.ok) {
        throw new Error('Failed to load animas');
      }

      const data = await response.json();
      console.log('Loaded animas:', data.personas);
      setPersonas(data.personas || []);
    } catch (err) {
      console.error('Error loading animas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  const handleCreatePersona = async (personaData) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...personaData,
          user_id: currentUser.uid
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create anima');
      }

      const newPersona = await response.json();
      setPersonas(prev => [...prev, newPersona]);
      setShowCreateModal(false);

      // Automatically open upload modal for new anima
      setSelectedPersona(newPersona);
      setShowUploadModal(true);
    } catch (err) {
      console.error('Error creating anima:', err);
      alert('Failed to create anima: ' + err.message);
    }
  };

  const handleDeletePersona = async (personaId) => {
    if (!window.confirm('Are you sure you want to delete this anima? This will remove all corpus files.')) {
      return;
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${API_URL}/api/personas/${personaId}?user_id=${currentUser.uid}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete anima');
      }

      setPersonas(prev => prev.filter(p => p.id !== personaId));
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(null);
      }
    } catch (err) {
      console.error('Error deleting anima:', err);
      alert('Failed to delete anima: ' + err.message);
    }
  };

  const handleUploadCorpus = (persona) => {
    setSelectedPersona(persona);
    setShowUploadModal(true);
  };

  const handleCorpusUploaded = () => {
    // Refresh personas to update chunk counts
    loadPersonas();
    setShowUploadModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-obsidian-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-obsidian-accent-primary mx-auto mb-2"></div>
          <p className="text-xs text-obsidian-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-obsidian-bg overflow-auto">
      <div className="mx-auto px-2 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-obsidian-text-primary">Animas</h1>
              <p className="text-xs text-obsidian-text-muted mt-0.5 mono">
                {personas.length} total
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="obsidian-button-primary flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50/50 border border-red-300 rounded text-xs text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Animas Grid */}
        {personas.length === 0 ? (
          <div className="obsidian-panel p-12 text-center max-w-lg mx-auto">
            <FileText className="w-8 h-8 text-obsidian-border mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-obsidian-text-primary mb-1">No animas</h3>
            <p className="text-xs text-obsidian-text-muted mb-4">
              Create an anima from writing samples
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="obsidian-button-primary inline-flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Anima</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {personas.map(persona => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onUpload={handleUploadCorpus}
                onDelete={handleDeletePersona}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <CreatePersonaModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePersona}
        />

        {selectedPersona && (
          <CorpusUploadModal
            isOpen={showUploadModal}
            onClose={() => {
              setShowUploadModal(false);
              setSelectedPersona(null);
            }}
            persona={selectedPersona}
            userId={currentUser.uid}
            onUploaded={handleCorpusUploaded}
          />
        )}
      </div>
    </div>
  );
};

export default PersonaManager;
