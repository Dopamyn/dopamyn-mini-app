import { useUser } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ReferralCardProps {
  referralCode: string;
}

export const ReferralCard = ({ referralCode }: ReferralCardProps) => {
  const { user } = useUser();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    // Construct the image URL
    const url = user
      ? `/api/og?${new URLSearchParams({
          name: user.name ?? user.x_handle,
          profile_image_url: user.profile_image_url || "",
        })}`
      : "/api/og";

    setImageUrl(url);
  }, [user]);

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{ aspectRatio: "1200/628" }}
    >
      {isImageLoading && (
        <div className="w-full h-full rounded-lg bg-neutral-900 p-4 flex flex-col justify-between">
          {/* Header with Dopamyn Logo */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" /> {/* Logo */}
            <Skeleton className="h-4 w-24" /> {/* Dopamyn text */}
          </div>

          {/* Main Content */}
          <div className="flex items-center gap-6">
            <Skeleton className="w-24 h-24 rounded-lg" />{" "}
            {/* Profile Picture */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" /> {/* Name */}
                <Skeleton className="h-4 w-32" /> {/* Handle */}
              </div>
              <Skeleton className="h-8 w-36" /> {/* CTA Button */}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" /> {/* Additional text */}
            <Skeleton className="h-8 w-8" /> {/* Logo or icon */}
          </div>
        </div>
      )}
      {imageUrl && (
        <Image
          src={imageUrl}
          alt="Referral Card Preview"
          fill
          priority
          className="object-cover rounded-lg border border-gray-600/30 shadow-lg"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={() => setIsImageLoading(false)}
        />
      )}
    </div>
  );
};
