import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-sm">
            <p className="text-sm text-red-600 font-medium mb-1">
              Произошла ошибка
            </p>
            <p className="text-xs text-gray-500 mb-3">
              {this.state.error?.message ?? 'Неизвестная ошибка'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
