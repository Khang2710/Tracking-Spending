import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children?: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { error: null, errorInfo: null };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-[#0f0f10] p-6 font-sans text-[#ff6b6b]">
        <h1 className="mb-2 text-2xl font-bold text-white">App Encountered a Display Error</h1>
        <p className="mb-4 text-[#8a8a8a]">Your saved financial data has not been cleared.</p>
        <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-[#1e1e21] p-4 text-[13px] text-[#f3d98b]">
          {this.state.error.toString()}
          {"\n\n"}
          {this.state.errorInfo?.componentStack}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 cursor-pointer rounded-xl border-0 bg-[#c9a45b] px-6 py-3 text-sm font-bold text-[#0f0f10]"
        >
          Reload App
        </button>
      </main>
    );
  }
}
