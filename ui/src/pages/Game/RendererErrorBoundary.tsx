import { Component, type ReactNode } from "react";

export class RendererErrorBoundary extends Component<Readonly<{
  children: ReactNode;
  fallback: ReactNode;
  onError: () => void;
}>, Readonly<{ failed: boolean }>> {
  state = { failed: false };

  static getDerivedStateFromError(): Readonly<{ failed: boolean }> {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
