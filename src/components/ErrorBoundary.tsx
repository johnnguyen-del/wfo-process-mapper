import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <div className="text-2xl">⚠️</div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <pre className="text-xs text-destructive bg-destructive/10 rounded-lg p-4 max-w-xl text-left overflow-auto">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.hash = '/'; }}
            className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
          >
            Go back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
