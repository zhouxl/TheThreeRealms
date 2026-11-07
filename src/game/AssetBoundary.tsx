import {Component, type ReactNode} from 'react';

/**
 * A malformed or missing GLB must not take down the whole scene.
 * The supplied procedural actor is retained while loading or after an error.
 */
export default class AssetBoundary extends Component<
  {children: ReactNode; fallback: ReactNode; label: string},
  {failed: boolean}
> {
  state = {failed: false};

  static getDerivedStateFromError(): {failed: boolean} {
    return {failed: true};
  }

  componentDidCatch(error: Error): void {
    console.error(`[TheThreeRealms] Cannot use ${this.props.label} GLB. Showing procedural fallback.`,error);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
