"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Users, Trophy, Star, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  image: string;
  followers: number;
  active_quests: number;
  token: string;
  description?: string;
}

interface ProjectsCardListProps {
  projects: Project[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

// Generate avatar with initials
const generateAvatar = (name: string) => {
  const initials = name.slice(0, 2).toUpperCase();
  const colors = [
    "bg-gradient-to-br from-green-400 to-emerald-600",
    "bg-gradient-to-br from-blue-400 to-indigo-600",
    "bg-gradient-to-br from-purple-400 to-pink-600",
    "bg-gradient-to-br from-pink-400 to-rose-600",
    "bg-gradient-to-br from-yellow-400 to-orange-600",
    "bg-gradient-to-br from-indigo-400 to-purple-600",
  ];
  const colorIndex = name.length % colors.length;

  return (
    <div
      className={`w-16 h-16 rounded-xl ${colors[colorIndex]} flex items-center justify-center shadow-lg`}
    >
      <span className="text-white font-bold text-lg">{initials}</span>
    </div>
  );
};

// Format number with K/M suffix
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

export default function ProjectsCardList({
  projects,
  loading,
  hasMore,
  onLoadMore,
}: ProjectsCardListProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const router = useRouter();

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading && hasMore) {
        onLoadMore();
      }
    },
    [loading, hasMore, onLoadMore]
  );

  const handleProjectClick = (project: Project) => {
    const projectName = project.name.toLowerCase().replace(/\s+/g, "-");
    router.push(`/projects/${projectName}`);
  };

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-brand-100">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-lg font-medium">Loading projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-8">
        {projects.map((project, index) => (
          <Card
            key={project.id}
            onClick={() => handleProjectClick(project)}
            className="bg-secondary-bg rounded-lg border border-tertiary-text/50 transition-all duration-200 hover:bg-tertiary-bg hover:border-green-bg/30 cursor-pointer hover:scale-105 group"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-4">
                  {/* Project Image */}
                  <div className="flex-shrink-0">
                    {project.image ? (
                      <img
                        src={project.image}
                        alt={project.name}
                        className="w-16 h-16 rounded-xl object-cover border border-tertiary-text/50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-16 h-16 rounded-xl ${
                        project.image ? "hidden" : ""
                      }`}
                    >
                      {generateAvatar(project.name)}
                    </div>
                  </div>

                  {/* Project Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-primary-text truncate group-hover:text-green-text transition-colors duration-200 flex items-center gap-2">
                      {project.name}
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-green-text" />
                    </h3>
                  </div>
                </div>

                {/* Project Number Badge */}
                <div className="flex-shrink-0">
                  <Badge className="bg-tertiary-bg text-secondary-text text-xs px-2 py-1">
                    #{index + 1}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <p className="text-sm text-secondary-text line-clamp-2">
                  {project.description}
                </p>
              )}
            </CardHeader>

            <CardContent className="p-6 pt-0">
              {/* Stats Section */}
              <div className="space-y-4">
                {/* Followers */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-secondary-text" />
                    <span className="text-sm text-secondary-text">
                      Followers
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary-text">
                    {formatNumber(project.followers)}
                  </span>
                </div>

                {/* Active Quests */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-secondary-text" />
                    <span className="text-sm text-secondary-text">
                      Active Quests
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary-text">
                    {project.active_quests} active
                  </span>
                </div>

                {/* Token */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-text" />
                    <span className="text-sm text-secondary-text">Token</span>
                  </div>
                  <span className="text-sm font-semibold text-primary-text">
                    {project.token}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Infinite Scroll Loading */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex items-center justify-center py-4"
        >
          {loading && (
            <Loader2 className="w-6 h-6 animate-spin text-green-text" />
          )}
        </div>
      )}
    </div>
  );
}
