import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test crash');
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal Component</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Normal Component')).toBeInTheDocument();
  });

  it('renders fallback UI when a child component throws', () => {
    // Suppress console.error output during test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test crash')).toBeInTheDocument();

    spy.mockRestore();
  });
});
