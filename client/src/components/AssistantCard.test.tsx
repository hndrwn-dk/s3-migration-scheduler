import React from 'react';
import { render, screen } from '@testing-library/react';
import AssistantCard from './AssistantCard';

test('renders cause, checks, and suggested action', () => {
  render(
    <AssistantCard
      title="Failure explanation"
      insight={{
        cause: 'Access was denied',
        checks: ['Confirm the key can read the bucket'],
        category: 'permissions',
        suggestedAction: 'Update the alias policy'
      }}
    />
  );

  expect(screen.getByText('Access was denied')).toBeInTheDocument();
  expect(screen.getByText('Confirm the key can read the bucket')).toBeInTheDocument();
  expect(screen.getByText('Update the alias policy')).toBeInTheDocument();
  expect(screen.getByText('permissions')).toBeInTheDocument();
});
