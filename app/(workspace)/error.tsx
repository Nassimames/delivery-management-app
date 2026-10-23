"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/async-states";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="We couldn't load this view"
      description="Try again. If the problem continues, contact your workspace administrator."
    >
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </ErrorState>
  );
}
