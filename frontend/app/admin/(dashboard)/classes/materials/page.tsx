import { Suspense } from "react";
import MaterialsClient from "./MaterialsClient";

export const dynamic = "force-dynamic";

export default function MaterialsPage() {
  return (
    <Suspense fallback={
        <div className="p-4">Loading materials...</div>
    }>
      <MaterialsClient />
    </Suspense>
  );
}