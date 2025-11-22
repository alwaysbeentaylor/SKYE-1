import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-sky-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Oeps! Er ging iets mis</h1>
            <p className="text-gray-600 mb-4">De app heeft een fout gevonden. Probeer de pagina te verversen.</p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-600 transition-colors"
            >
              Pagina Verversen
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">Technische details</summary>
                <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

