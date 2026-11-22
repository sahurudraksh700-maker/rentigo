import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('RentKaro ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F7F7F5] dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]">
          <div className="max-w-md w-full bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 sm:p-8 text-center shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-display text-xl font-bold">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B] break-words">
              We hit an unexpected issue loading your campus data. Please reload
              the page to continue.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reload RentKaro</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
