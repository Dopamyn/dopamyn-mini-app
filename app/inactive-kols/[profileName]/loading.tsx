export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="flex flex-col lg:flex-row items-start w-full">
        {/* Main Content */}
        <div className="flex-1 py-4 lg:py-8 px-4 lg:pl-12 lg:pr-4 w-full">
          <div className="max-w-4xl mx-auto">
            {/* Search Bar Skeleton */}
            <div className="w-full h-10 lg:h-12 bg-neutral-700 rounded-lg animate-pulse mb-6 lg:mb-8" />

            {/* Profile Header Skeleton */}
            <div className="bg-neutral-800 p-4 lg:p-6 rounded-lg animate-pulse">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-neutral-600 rounded-full" />
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div className="h-6 bg-neutral-700 rounded w-48 mx-auto sm:mx-0" />
                  <div className="h-4 bg-neutral-600 rounded w-72 max-w-full mx-auto sm:mx-0" />
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-8 bg-neutral-700 rounded w-24"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Skeleton */}
            <div className="mt-6 lg:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-neutral-800 p-4 lg:p-6 rounded-lg h-[250px] lg:h-64 animate-pulse"
                >
                  <div className="h-4 bg-neutral-600 rounded w-32 mb-4" />
                  <div className="h-[200px] lg:h-48 bg-neutral-700 rounded" />
                </div>
              ))}
            </div>

            {/* Market Cap Distribution Skeleton */}
            <div className="mt-6 lg:mt-8">
              <div className="bg-neutral-800 p-4 lg:p-6 rounded-lg h-[250px] lg:h-64 animate-pulse">
                <div className="h-4 bg-neutral-600 rounded w-48 mb-4" />
                <div className="h-[200px] lg:h-52 bg-neutral-700 rounded" />
              </div>
            </div>

            {/* Token Overview Skeleton */}
            <div className="mt-6 lg:mt-8">
              <div className="bg-neutral-800 p-4 lg:p-6 rounded-lg animate-pulse">
                <div className="h-4 bg-neutral-600 rounded w-40 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-neutral-700 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Feed Sidebar Skeleton */}
        <div className="w-full lg:w-[480px] py-4 lg:py-8 px-4 lg:pr-12 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16">
          <div className="h-full lg:overflow-y-auto">
            <div className="bg-neutral-800 p-4 lg:p-6 rounded-lg animate-pulse">
              <div className="h-4 bg-neutral-600 rounded w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-neutral-700 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
