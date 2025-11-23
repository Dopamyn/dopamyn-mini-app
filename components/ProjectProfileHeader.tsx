"use client";

import type { AuthorData } from "@/app/types";
import Image from "next/image";

interface ProjectProfileHeaderProps {
  project: AuthorData;
  accountCreatedText: string;
}

export default function ProjectProfileHeader({
  project,
  accountCreatedText,
}: ProjectProfileHeaderProps) {
  return (
    <div className="card-trendsage group mb-8">
      <div className="flex flex-col sm:flex-row items-start gap-6 relative">
        {/* Project Website Button - Top right */}
        {project.url_in_bio && (
          <div className="absolute top-0 right-0">
            <a
              href={`https://${project.url_in_bio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Visit Website
            </a>
          </div>
        )}
        <Image
          src={
            project.profile_image_url || "/placeholder.svg?height=200&width=200"
          }
          alt={project.name}
          width={96}
          height={96}
          className="w-24 h-24 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-accent-brand/50 transition-all"
        />
        <div className="flex-1 pr-32 sm:pr-36">
          <h1 className="text-2xl font-bold text-gray-100 mb-1 group-hover:text-accent-brand transition-colors">
            {project.name}
          </h1>
          <p className="text-lg text-gray-400 mb-1">@{project.author_handle}</p>
          {accountCreatedText && (
            <p className="text-xs text-gray-500 mb-3">{accountCreatedText}</p>
          )}
          {project.bio && (
            <p className="text-sm text-gray-300 leading-snug">{project.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}
