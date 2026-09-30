import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(() => Promise.reject(new Error('offline'))),
    post: jest.fn(() => Promise.reject(new Error('offline'))),
    put: jest.fn(() => Promise.reject(new Error('offline'))),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })
}));

test('renders the migration dashboard', async () => {
  render(<App />);
  expect(await screen.findByText(/S3 Migration Dashboard/i)).toBeInTheDocument();
});
