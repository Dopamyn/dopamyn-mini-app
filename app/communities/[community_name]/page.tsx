import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CommunityProfileClient from "./CommunityProfileClient";

interface CommunityPageProps {
  params: {
    community_name: string;
  };
}

export default function CommunityPage({ params }: CommunityPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      }
    >
      <CommunityProfileClient communityName={params.community_name} />
    </Suspense>
  );
}
