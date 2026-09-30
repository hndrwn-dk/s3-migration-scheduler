import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { aiService } from '../services/api';
import { AiPublicSettings } from '../types';
import LoadingSpinner from './LoadingSpinner';

const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<AiPublicSettings | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const current = await aiService.getSettings();
        setSettings(current);
        setBaseUrl(current.baseUrl);
        setModel(current.model);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load AI settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await aiService.saveSettings({
        baseUrl,
        model,
        apiKey: apiKey.trim() || undefined
      });
      setSettings(saved);
      setApiKey('');
      toast.success('AI settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await aiService.testConnection();
      toast.success('AI provider responded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner text="Loading assistant settings..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Assistant settings</h2>
        <p className="mt-2 text-gray-600">
          Connect any OpenAI-compatible endpoint. The key is stored on the server and is not shown again.
        </p>
      </div>

      {!settings?.configured && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
          No API key is configured. Migration, history, and logs keep working. Assistant actions stay unavailable until you add a key.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Provider</h3>
            <p className="text-sm text-gray-500">Base URL, model, and API key</p>
          </div>
        </div>

        <div>
          <label htmlFor="ai-base-url" className="block text-sm font-medium text-gray-700">Base URL</label>
          <input
            id="ai-base-url"
            type="url"
            required
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.openai.com/v1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="ai-model" className="block text-sm font-medium text-gray-700">Model</label>
          <input
            id="ai-model"
            type="text"
            required
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="gpt-4o-mini"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="ai-api-key" className="block text-sm font-medium text-gray-700">API key</label>
          <input
            id="ai-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
            placeholder={settings?.keyHint ? 'Leave blank to keep the saved key' : 'Paste a provider key'}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          {settings?.keyHint && (
            <p className="mt-2 text-xs text-gray-500">Saved key hint: {settings.keyHint}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !settings?.configured}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test connection'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsTab;
