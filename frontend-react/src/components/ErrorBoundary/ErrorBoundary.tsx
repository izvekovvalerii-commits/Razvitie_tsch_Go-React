import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(_error: Error): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('❌ Error caught by boundary:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // TODO: Отправить ошибку в систему мониторинга (Sentry, LogRocket, etc.)
        // if (window.Sentry) {
        //     window.Sentry.captureException(error, { extra: errorInfo });
        // }
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-icon">⚠️</div>
                        <h1>Что-то пошло не так</h1>
                        <p className="error-message">
                            Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <details className="error-details">
                                <summary>Техническая информация</summary>
                                <div className="error-stack">
                                    <p><strong>Ошибка:</strong> {this.state.error.toString()}</p>
                                    {this.state.errorInfo && (
                                        <pre>{this.state.errorInfo.componentStack}</pre>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="error-actions">
                            <button
                                className="btn-primary"
                                onClick={this.handleReset}
                            >
                                Попробовать снова
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => window.location.href = '/'}
                            >
                                На главную
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
