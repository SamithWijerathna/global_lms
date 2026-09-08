"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { AlertTriangleIcon, RefreshCcwIcon } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-default-50 px-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="flex flex-col items-center gap-3 pt-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-danger-100 text-danger">
            <AlertTriangleIcon size={28} />
          </div>
          <h2 className="text-xl font-semibold text-center">
            Something went wrong
          </h2>
          <p className="text-default-500 text-sm text-center max-w-sm">
            An unexpected error occurred. Please try again or contact support if
            the problem persists.
          </p>
        </CardHeader>

        <Divider />

        <CardBody className="flex flex-col gap-4 pb-4">
          <Button
            color="primary"
            startContent={<RefreshCcwIcon size={18} />}
            onPress={reset}
            className="w-full"
          >
            Try Again
          </Button>

          <Button
            variant="light"
            className="w-full bg-gray-100 dark:bg-gray-800"

            onPress={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
