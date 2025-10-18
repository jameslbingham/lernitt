// client/src/components/ErrorBoundary.jsx
import { Component } from "react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Optionally send to an error service
    console.error("[ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="opacity-80 mb-4">
            Please try again or go back to the homepage.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="border px-4 py-2 rounded-2xl hover:bg-gray-50"
            >
              Try again
            </button>
            <Link to="/" className="border px-4 py-2 rounded-2xl shadow-sm hover:shadow-md">
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
