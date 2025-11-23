import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CommunitiesClient from "./CommunitiesClient";

export default function CommunitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      }
    >
      <CommunitiesClient />
    </Suspense>
  );
}
