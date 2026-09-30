import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { AiInsight } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface AssistantCardProps {
  title: string;
  insight: AiInsight | null;
  loading?: boolean;
  error?: string | null;
  onApply?: (insight: AiInsight) => void;
}

const AssistantCard: React.FC<AssistantCardProps> = ({
  title,
  insight,
  loading = false,
  error = null,
  onApply
}) => {
  if (!loading && !error && !insight) return null;

  return (
    <section className="rounded-xl border border-primary-200 bg-primary-50 p-4 shadow-soft">
      <div className="flex items-center gap-2 text-primary-800">
        <SparklesIcon className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {insight?.category && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-primary-700">
            {insight.category}
          </span>
        )}
      </div>

      {loading && (
        <div className="py-4">
          <LoadingSpinner size="small" text="Asking the assistant..." />
        </div>
      )}

      {error && !loading && (
        <p className="mt-3 text-sm text-error-700">{error}</p>
      )}

      {insight && !loading && (
        <div className="mt-3 space-y-3 text-sm text-gray-800">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cause</p>
            <p className="mt-1">{insight.cause}</p>
          </div>
          {insight.checks.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Checks</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {insight.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Suggested action</p>
            <p className="mt-1">{insight.suggestedAction}</p>
          </div>
          {insight.settings?.scheduleHint && (
            <p className="text-xs text-gray-600">Schedule note: {insight.settings.scheduleHint}</p>
          )}
          {onApply && insight.settings && (
            <button
              type="button"
              onClick={() => onApply(insight)}
              className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Apply to form
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default AssistantCard;
