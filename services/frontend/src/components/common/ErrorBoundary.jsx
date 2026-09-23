import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, error: null, resetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-48 flex-col items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md w-full">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2 text-sm flex flex-col gap-4">
              <p>
                This section could not be displayed.
              </p>
              <Button
                variant="outline"
                className="self-start"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
