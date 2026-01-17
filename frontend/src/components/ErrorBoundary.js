import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for now; could be sent to external monitoring
    console.error('Unhandled error in component tree:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem' }}>
          <h2>Erro ao carregar a tela</h2>
          <p>Ocorreu um erro ao renderizar este componente.</p>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
