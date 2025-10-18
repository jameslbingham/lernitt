// client/src/lib/uiHelpers.js
// -----------------------------------------------------------------------------
// Shared UI helpers: ErrorBoundary, RetryCard, Skeletons
// Reusable across admin tabs. No external deps besides React and optional toast.
// -----------------------------------------------------------------------------

import React from "react";

export function RetryCard({ onRetry, error, title = "Something went wrong" }) {
  return (
    <div className="p-4 border rounded-2xl bg-white">
      <h3 className="font-bold mb-2">{title}</h3>
      {error ? (
        <div className="text-sm text-red-600 mb-3">{String(error?.message || error)}</div>
      ) : null}
      <button className="px-3 py-1 border rounded" onClick={onRetry}>Retry</button>
    </div>
  );
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(error) {
    return { err: error };
  }
  componentDidCatch(error, info) {
    // Optional: send to logging here
    if (this.props.onError) this.props.onError(error, info);
  }
  render() {
    if (this.state.err) {
      return <RetryCard error={this.state.err} onRetry={this.props.onRetry || (() => location.reload())} />;
    }
    return this.props.children;
  }
}

export function SkeletonBlock({ h = "h-64" }) {
  return <div className={`animate-pulse ${h} bg-gray-100 rounded`} />;
}

export function SkeletonTable({ rows = 6 }) {
  return (
    <table className="min-w-full text-sm">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-t">
            <td className="p-2">
              <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmptyState({ label = "No data" }) {
  return <div className="p-6 text-gray-600">{label}</div>;
}

export default {
  RetryCard,
  ErrorBoundary,
  SkeletonBlock,
  SkeletonTable,
  EmptyState,
};
