import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
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
        <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
          <Alert variant="destructive" className="max-w-md w-full">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2 text-sm flex flex-col gap-4">
              <p>
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <Button
                variant="outline"
                className="self-start"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
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
