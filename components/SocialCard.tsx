import { useUser } from "@/contexts/UserContext";
import { forwardRef } from "react";

export const SocialCard = forwardRef<HTMLDivElement>((props, ref) => {
  const { user } = useUser();

  // Helper to determine if URL is external
  const isExternalUrl = (url: string) => {
    return url.startsWith("http://") || url.startsWith("https://");
  };

  const profileImage = user?.profile_image_url ?? "/fulllogo.svg";

  return (
    <div className="max-w-[600px] w-full mx-auto select-none  border border-[#2D3B39]">
      <div
        ref={ref}
        className="relative w-full overflow-hidden  bg-black"
        style={{ aspectRatio: "1200/628" }}
      >
        {/* Background Image with Blur */}
        <div className="absolute inset-0">
          <img
            src="/blur.png"
            alt="Background"
            className="object-cover w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="relative px-6 text-white h-full flex flex-col justify-evenly">
          {/* First Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={profileImage}
                className="w-12 h-12 rounded-[7px]"
                alt="Profile"
                crossOrigin={
                  isExternalUrl(profileImage) ? "anonymous" : undefined
                }
              />
              <div>
                <h3 className=" mb-1 text-sm text-[#DFFCF6]">
                  {user?.name ?? "Dopamyn"}
                </h3>
                <p className="text-[10px] text-[#A9F0DF] font-semibold ">
                  @{user?.x_handle ?? "dopamyn_fun"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-12">
              <div>
                <h3 className="text-gray-400 mb-1 text-xs">Followers</h3>
                <p className="text-sm">{user?.followers ?? 0}</p>
              </div>
              <div>
                <h3 className="text-gray-400 mb-1 text-xs">Rewards</h3>
                <p className="text-sm">{user?.total_points ?? 0} DOPE</p>
              </div>
            </div>
          </div>

          {/* Second Row - with dashed borders */}
          <div className="py-4 border-y border-dashed border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-base text-[#CFCFCF]">
                Turn your Popularity on X into
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <h2 className="text-base text-[#CFCFCF]">
                Exciting Rewards with
              </h2>
              <img
                src="/fulllogo.svg"
                alt="Dopamyn Logo"
                className="w-6 h-6"
              />
              <span className="text-base text-[#CFCFCF]">Dopamyn</span>
            </div>
          </div>

          {/* Third Row */}
          <div className="flex items-center justify-between">
            <p className=" text-[#6A7B78] text-xs">
              Here’s a reward to start with
            </p>
            <img
              src="/earn.png"
              alt="Earn 10 DOPE Now"
              className="w-48 h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
