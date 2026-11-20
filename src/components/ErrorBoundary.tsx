import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Enterprise React Error Boundary to catch and gracefully display any runtime UI rendering errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by DOMINO SKY ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0d1522] border border-red-500/50 shadow-2xl text-center space-y-4 font-mono">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Operational Display Fault
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected error occurred in the operations display engine. The underlying simulation engine state remains preserved.
            </p>
            {this.state.error && (
              <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-left text-[11px] text-red-300 max-h-32 overflow-y-auto">
                <code>{this.state.error.message}</code>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reboot Command Display
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
