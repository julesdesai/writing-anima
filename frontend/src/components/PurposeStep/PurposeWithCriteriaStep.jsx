import React, { useState } from 'react';
import { Target, Brain, Palette, Send, Loader2, ArrowRight, Settings } from 'lucide-react';
import WritingCriteriaEditor from '../WritingCriteria/WritingCriteriaEditor';

const PurposeWithCriteriaStep = ({ purpose, setPurpose, onSubmit }) => {
  const [step, setStep] = useState('purpose'); // 'purpose' or 'criteria'
  const [criteria, setCriteria] = useState(null);

  // Handle both old format (string) and new format (object with topic/context)
  const purposeData = typeof purpose === 'string' ? { topic: purpose, context: '' } : purpose;

  const handlePurposeSubmit = () => {
    if (!purposeData.topic?.trim()) return;
    setStep('criteria');
  };

  const updatePurpose = (field, value) => {
    setPurpose(prev => {
      const current = typeof prev === 'string' ? { topic: prev, context: '' } : prev;
      return { ...current, [field]: value };
    });
  };

  const handleFinalSubmit = () => {
    onSubmit(purpose, criteria);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey && step === 'purpose') {
      handlePurposeSubmit();
    }
  };

  if (step === 'criteria') {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Your Writing</h1>
            <p className="text-lg text-slate-600">AI has generated some possibly desirable characteristics for your writing. Review and customize them.</p>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Your Writing</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  <strong>Topic:</strong> {purposeData.topic}
                  {purposeData.context && (
                    <>
                      <br />
                      <strong>Context:</strong> {purposeData.context}
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep('purpose')}
              className="mt-3 text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              Edit
            </button>
          </div>

          <WritingCriteriaEditor
            purpose={purpose}
            onCriteriaChange={setCriteria}
          />

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep('purpose')}
              className="px-6 py-3 text-slate-600 hover:text-slate-800 flex items-center gap-2 transition-colors"
            >
              ← Back to Purpose
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={!criteria}
              className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Start Writing
            </button>
          </div>

          {criteria && (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500">
                Your AI critics will use these {Object.values(criteria).flat().filter(c => c?.enabled).length} criteria to provide targeted feedback
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Purpose definition step
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Writing Assistant</h1>
          <p className="text-lg text-slate-600">Multi-agent real-time criticism and guidance</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-blue-600 w-6 h-6" />
            <h2 className="text-2xl font-semibold text-slate-800">Define Your Writing</h2>
          </div>
          
          <p className="text-slate-600 mb-6">
            Define what you're writing about and who you're writing for. We'll help you refine them into guidance for your agents.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Topic (What are you writing about?)
              </label>
              <textarea
                value={purposeData.topic || ''}
                onChange={(e) => updatePurpose('topic', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: The benefits of renewable energy adoption and policy recommendations"
                className="w-full h-24 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Context (Who are you writing for? What's the setting?)
              </label>
              <textarea
                value={purposeData.context || ''}
                onChange={(e) => updatePurpose('context', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: Policymakers and government officials; formal policy brief requiring evidence-based reasoning"
                className="w-full h-24 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>


          <div className="mt-6">
            <button
              onClick={handlePurposeSubmit}
              disabled={!purposeData.topic?.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Refine Topic and Context
            </button>
          </div>
          
          <p className="text-sm text-slate-500 mt-2 text-center">
            Next: Review and customise your writing criteria
          </p>
        </div>
      </div>
    </div>
  );
};

export default PurposeWithCriteriaStep;