import { Component, type ReactNode } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> : this.props.children; }
}
export function App() { return <ErrorBoundary><RouterProvider router={router} /></ErrorBoundary>; }
