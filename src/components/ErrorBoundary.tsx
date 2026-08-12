import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0E0D0A] text-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="max-w-md w-full border border-red-500/30 bg-red-950/20 p-6 rounded-xl space-y-4">
            <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
            <p className="text-sm text-neutral-400">
              An unexpected error occurred in the application interface.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-black/60 p-3 rounded text-left overflow-x-auto text-red-300 max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-[#FF6B1A] text-black font-semibold rounded-lg hover:bg-[#FF6B1A]/90 transition-colors uppercase tracking-wider text-xs"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
