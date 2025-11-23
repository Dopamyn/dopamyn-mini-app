"use client";

import {
  CheckCircle,
  Eye,
  Loader2,
  Play,
  RefreshCcw,
  RotateCcw,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

import { useToast } from "@/hooks/use-toast";
// Simplified type definitions
interface JobStatus {
  id: number;
  project_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at?: string;
  error_message?: string;
  status_info?: {
    message: string;
    estimated_start_time?: string;
    elapsed_time_minutes?: number;
    estimated_completion?: string;
    results_available?: boolean;
    can_retry?: boolean;
  };
  endpoints?: {
    job_details: string;
    results?: string;
    retry?: string;
  };
}

interface InfluencerMatch {
  id: number;
  project_id: string;
  influencer_handle: string;
  cred_score: number;
  tier: string;
  synergy_rating_to_project: number;
  keywords_from_tweets: string[];
  synergy_rationale: string;
  recommended_marketing_angle: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface MatchmakingResults {
  project_id: string;
  filters_applied: {
    tier_filter: string | null;
    min_cred_score: number | null;
    min_synergy_rating: number | null;
    order_by: string;
  };
  pagination: {
    page: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
    showing_count: number;
    total_count?: number;
    showing_results: string;
  };
  matches: InfluencerMatch[];
}

interface InfluencerMatchMakingProps {
  projectHandle: string;
}

const getScoreColor = (score: number) => {
  if (score >= 4) return "text-green-400";
  if (score >= 3) return "text-yellow-400";
  return "text-red-400";
};

export default function InfluencerMatchMaking({
  projectHandle,
}: InfluencerMatchMakingProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isCheckingResults, setIsCheckingResults] = useState(true);
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [existingResults, setExistingResults] =
    useState<MatchmakingResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Results state
  const [results, setResults] = useState<MatchmakingResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Filters state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [minCredScore, setMinCredScore] = useState<number | null>(null);
  const [minSynergyRating, setMinSynergyRating] = useState<number | null>(null);

  // Check for existing results and job status on mount
  useEffect(() => {
    checkExistingResultsAndJobStatus();
  }, [projectHandle]);

  // Polling for job status when job is active
  useEffect(() => {
    if (
      currentJob &&
      (currentJob.status === "pending" || currentJob.status === "processing")
    ) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/jobs/project/${projectHandle}`, {
            signal: AbortSignal.timeout(30000),
          });

          if (response.ok) {
            const statusData = await response.json();
            const jobData = statusData.data;
            setCurrentJob(jobData);

            // If job completed, check for results
            if (jobData.status === "completed") {
              checkExistingResultsAndJobStatus();
            }
          }
        } catch (error) {
          console.error("Failed to poll job status:", error);
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [currentJob, projectHandle]);

  // Fetch results when filters change
  useEffect(() => {
    if (showResults) {
      fetchResults();
    }
  }, [
    projectHandle,
    currentPage,
    pageSize,
    minCredScore,
    minSynergyRating,
    showResults,
  ]);

  const checkExistingResultsAndJobStatus = async () => {
    setIsCheckingResults(true);
    setError(null);

    try {
      // First, check for existing matchmaking results
      const resultsResponse = await fetch(
        `/api/matchmaking/top-matches/${projectHandle}?page=1&page_size=1`,
        {
          signal: AbortSignal.timeout(30000),
        }
      );

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const matches = resultsData.data || resultsData.result;

        if (matches && matches.matches && matches.matches.length > 0) {
          // We have existing results
          setExistingResults(matches);
          setCurrentJob(null); // Clear any job status since we have results
          setShowResults(true); // Auto-show results
          return;
        }
      }

      // No existing results, check for job status
      const jobResponse = await fetch(`/api/jobs/project/${projectHandle}`, {
        signal: AbortSignal.timeout(30000),
      });

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setCurrentJob(jobData.data);
        setExistingResults(null);
        setShowResults(false);
      } else if (jobResponse.status === 404) {
        // No jobs exist for this project
        setCurrentJob(null);
        setExistingResults(null);
        setShowResults(false);
      }
    } catch (error) {
      console.error("Failed to check results and job status:", error);
      setError("Failed to check existing results and job status");
    } finally {
      setIsCheckingResults(false);
    }
  };

  const fetchResults = async () => {
    try {
      setResultsLoading(true);
      setResultsError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        include_total: "true",
      });

      if (minCredScore !== null)
        params.append("min_cred_score", minCredScore.toString());
      if (minSynergyRating !== null)
        params.append("min_synergy_rating", minSynergyRating.toString());

      const response = await fetch(
        `/api/matchmaking/top-matches/${projectHandle}?${params.toString()}`,
        {
          signal: AbortSignal.timeout(15000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.data || data.result);
      } else {
        throw new Error(`Failed to fetch results: HTTP ${response.status}`);
      }
    } catch (err) {
      setResultsError(
        err instanceof Error ? err.message : "Failed to fetch results"
      );
    } finally {
      setResultsLoading(false);
    }
  };

  const createJob = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/jobs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectHandle,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        // Immediately fetch the latest job status/results after creation
        await checkExistingResultsAndJobStatus();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || errorData.error || `HTTP ${response.status}`
        );
      }
    } catch (error) {
      setError(
        `Failed to create job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      console.error("Job creation error:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const retryJob = async () => {
    if (!currentJob) return;

    try {
      const response = await fetch(`/api/jobs/${currentJob.id}/retry`, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const result = await response.json();
        const jobData = result.data;
        setCurrentJob(jobData);
        setError(null);
      } else {
        throw new Error("Failed to retry job");
      }
    } catch (error) {
      setError("Failed to retry job. Please try again.");
      console.error("Job retry error:", error);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Clear filters
  const clearFilters = () => {
    setMinCredScore(null);
    setMinSynergyRating(null);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "completed":
        return <Users className="h-4 w-4" />;
      case "failed":
        return <RotateCcw className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  };

  // Show loading state while checking
  if (isCheckingResults) {
    return (
      <div className="card-trendsage">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent-brand mr-2" />
          <span className="text-sm sm:text-base text-gray-300">
            Checking for existing results...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card-trendsage">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center gap-2 sm:gap-3">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent-brand" />
                Influencer Matchmaking
              </h2>
              {showResults && (
                <Button
                  onClick={checkExistingResultsAndJobStatus}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-gray-100"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm sm:text-base text-gray-400">
                {showResults && results
                  ? `${results.pagination.showing_count} matches found`
                  : "Find the perfect influencers to promote your project using AI-powered analysis"}
              </p>

              {/* Filters */}
              {showResults && (
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm font-medium text-gray-300">
                    Filters:
                  </span>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">
                      Min Cred Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={minCredScore || ""}
                      onChange={(e) =>
                        setMinCredScore(
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-16 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-accent-brand text-gray-100"
                      placeholder="0-5"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Min Synergy</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={minSynergyRating || ""}
                      onChange={(e) =>
                        setMinSynergyRating(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      className="w-16 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-accent-brand text-gray-100"
                      placeholder="1-5"
                    />
                  </div>

                  {(minCredScore !== null || minSynergyRating !== null) && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-xs sm:text-sm">{error}</p>
          </div>
        )}

        {/* Existing Results */}
        {existingResults && !showResults && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-semibold text-sm sm:text-base text-green-400">
                    Analysis Complete!
                  </p>
                  <p className="text-xs sm:text-sm text-green-300">
                    Found {existingResults.pagination.showing_count} influencer
                    matches
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowResults(true)}
                  className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Results
                </Button>
                <Button
                  onClick={createJob}
                  disabled={isCreating}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/20 text-xs sm:text-sm"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  New Analysis
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Job Status */}
        {currentJob && !existingResults && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge
                  className={`${getStatusColor(currentJob.status)} border`}
                >
                  {getStatusIcon(currentJob.status)}
                  <span className="ml-1 capitalize">{currentJob.status}</span>
                </Badge>
              </div>
              <div className="flex gap-2">
                {currentJob.status === "completed" && (
                  <Button
                    onClick={() => setShowResults(true)}
                    size="sm"
                    variant="outline"
                    className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Results
                  </Button>
                )}
                {currentJob.status === "failed" &&
                  currentJob.status_info?.can_retry && (
                    <Button
                      onClick={retryJob}
                      size="sm"
                      variant="outline"
                      className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  )}
              </div>
            </div>

            {/* Status Information */}
            {currentJob.status_info && (
              <div className="bg-gray-700 rounded-lg p-3 mb-3">
                <p className="text-xs sm:text-sm text-gray-300 mb-2">
                  {currentJob.status === "processing" ? (
                    <span className="text-xs sm:text-sm text-gray-300 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Your AI Analysis is in progress...
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-gray-300 mb-2">
                      {currentJob.status_info.message}
                    </span>
                  )}

                  {currentJob.status_info.message}
                </p>

                {currentJob.status_info.estimated_start_time && (
                  <p className="text-xs text-gray-400">
                    <strong>Estimated start:</strong>{" "}
                    {currentJob.status_info.estimated_start_time}
                  </p>
                )}

                {currentJob.status_info.elapsed_time_minutes && (
                  <p className="text-xs text-gray-400">
                    <strong>Elapsed time:</strong>{" "}
                    {currentJob.status_info.elapsed_time_minutes} minutes
                  </p>
                )}

                {currentJob.status_info.estimated_completion && (
                  <p className="text-xs text-gray-400">
                    <strong>Estimated completion:</strong>{" "}
                    {currentJob.status_info.estimated_completion}
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {currentJob.status === "failed" && currentJob.error_message && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-xs sm:text-sm">
                  {currentJob.error_message}
                </p>
              </div>
            )}

            {/* Created Time */}
            <p className="text-xs text-gray-400">
              Created {formatTimeAgo(currentJob.created_at)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!existingResults && !showResults && (
          <div className="flex gap-2">
            {!currentJob ||
            currentJob.status === "failed" ||
            currentJob.status === "completed" ? (
              <Button
                onClick={createJob}
                disabled={isCreating}
                className="flex-1 bg-accent-brand hover:bg-[#00C484] text-gray-900"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {currentJob?.status === "completed"
                  ? "Start New Analysis"
                  : "Start Analysis"}
              </Button>
            ) : null}
          </div>
        )}

        {/* Info Section */}
        {!currentJob && !existingResults && !showResults && (
          <div className="bg-accent-brand/20 border border-accent-brand/30 rounded-lg p-4">
            <div className="flex items-start gap-3 text-xs sm:text-sm text-accent-brand">
              <Target className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-semibold text-sm sm:text-base mb-1 text-gray-100">
                  What happens during analysis:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                  <li>AI analyzes thousands of potential influencer matches</li>
                  <li>
                    Evaluates audience overlap, engagement quality, and brand
                    alignment
                  </li>
                  <li>
                    Generates comprehensive match scores and recommendations
                  </li>
                  <li>Typical analysis takes 5-15 minutes to complete</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {showResults && (
          <div className="pt-4">
            {/* Results Container */}
            <div className="max-h-[60vh] overflow-y-auto">
              {resultsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-brand" />
                  <span className="ml-2 text-sm sm:text-base text-gray-300">
                    Loading results...
                  </span>
                </div>
              ) : resultsError ? (
                <div className="text-center py-12">
                  <div className="text-red-400 font-semibold text-sm sm:text-base mb-2">
                    Error Loading Results
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm mb-4">
                    {resultsError}
                  </div>
                  <button
                    onClick={fetchResults}
                    className="px-4 py-2 bg-accent-brand text-gray-900 rounded-lg hover:bg-[#00C484] transition-colors text-xs sm:text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : !results || results.matches.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-2">
                    No matches found
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400">
                    Try adjusting your filter criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.matches.map((influencer: InfluencerMatch) => (
                    <div
                      key={influencer.id}
                      className="border border-gray-700 bg-gray-800 rounded-lg p-4 hover:shadow-lg hover:border-accent-brand/30 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Main Content */}
                        <div className="flex-1">
                          {/* Card Header: handle left, collaborate right */}
                          <div className="flex items-center justify-between mb-2">
                            <h3
                              className="font-semibold text-gray-100 cursor-pointer hover:text-accent-brand transition-colors"
                              onClick={() =>
                                window.open(
                                  `https://twitter.com/${influencer.influencer_handle}`,
                                  "_blank"
                                )
                              }
                            >
                              @{influencer.influencer_handle}
                            </h3>
                            {/* <CollaborateDialog influencerHandle={profile.author_handle}> */}
                            <Button
                              className="bg-accent-brand hover:bg-[#00C080] text-gray-900 font-medium"
                              onClick={() => {
                                toast({
                                  title: "Coming Soon",
                                  description: "This feature is coming soon.",
                                });
                              }}
                            >
                              Collaborate
                            </Button>
                            {/* </CollaborateDialog> */}
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm mb-3">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-400">Cred Score:</span>
                              <span
                                className={`font-semibold ${getScoreColor(
                                  influencer.cred_score
                                )}`}
                              >
                                {influencer.cred_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-400">Synergy:</span>
                              <span className="font-semibold text-accent-brand">
                                {influencer.synergy_rating_to_project}/5
                              </span>
                            </div>
                          </div>

                          {/* Tokens */}
                          {influencer.keywords_from_tweets.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-400 mb-1">
                                Related Tokens:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {influencer.keywords_from_tweets
                                  .slice(0, 5)
                                  .map((keyword: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-accent-brand/20 text-accent-brand text-xs rounded border border-accent-brand/30"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                {influencer.keywords_from_tweets.length > 5 && (
                                  <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded border border-gray-600">
                                    +
                                    {influencer.keywords_from_tweets.length - 5}{" "}
                                    more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Synergy Rationale */}
                          {influencer.synergy_rationale && (
                            <div className="mb-3 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                              <p className="text-xs text-blue-400 font-semibold mb-1">
                                Why this match works:
                              </p>
                              <p className="text-xs sm:text-sm text-blue-300">
                                {influencer.synergy_rationale}
                              </p>
                            </div>
                          )}

                          {/* Marketing Angle */}
                          {influencer.recommended_marketing_angle && (
                            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                              <p className="text-xs text-green-400 font-semibold mb-1">
                                Recommended approach:
                              </p>
                              <p className="text-xs sm:text-sm text-green-300">
                                {influencer.recommended_marketing_angle}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {results?.pagination &&
                results.pagination.total_count &&
                results.pagination.total_count > pageSize && (
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-xs sm:text-sm text-gray-400">
                        {results.pagination.showing_results}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!results.pagination.has_previous}
                          className="px-3 py-1 text-xs sm:text-sm border border-gray-600 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        <span className="px-3 py-1 text-xs sm:text-sm text-gray-300">
                          Page {results.pagination.page}
                        </span>

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!results.pagination.has_next}
                          className="px-3 py-1 text-xs sm:text-sm border border-gray-600 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
