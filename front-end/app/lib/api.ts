export type Verdict = "APPROVE" | "REQUEST_CHANGES" | "COMMENT" | "PENDING";

export type VerdictFilter = Exclude<Verdict, "PENDING">;

export type ApiReview = {
  id: string;
  owner: string;
  repo: string;
  pullNumber: number;
  prTitle: string;
  headSha: string;
  changedFilesCount: number;
  commitsCount: number;
  verdict: VerdictFilter;
  content: string | null;
  criticalFixes: string[];
  suggestions: string[];
  createdAt: string;
};

export type ReviewsEnvelope = {
  data: ApiReview[];
  total: number;
  limit: number;
  offset: number;
};

export type FetchReviewsParams = {
  limit?: number;
  offset?: number;
  repo?: string;
  verdict?: VerdictFilter;
  search?: string;
  since?: string | Date;
};

export type TriggerReviewParams = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type TriggerReviewResult = {
  message: string;
  eventId: string;
};

export class ApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }
  return base;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : `Request failed with status ${res.status}`;
    const errors = body && typeof body === "object" ? body.errors : undefined;
    throw new ApiError(message, res.status, errors);
  }

  return body as T;
}

export async function fetchReviews(
  params: FetchReviewsParams = {},
  init?: RequestInit,
): Promise<ReviewsEnvelope> {
  const query = new URLSearchParams();

  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.repo) query.set("repo", params.repo);
  if (params.verdict) query.set("verdict", params.verdict);
  if (params.search) query.set("search", params.search);
  if (params.since) {
    query.set(
      "since",
      params.since instanceof Date ? params.since.toISOString() : params.since,
    );
  }

  const qs = query.toString();
  const res = await fetch(`${getApiBaseUrl()}/reviews${qs ? `?${qs}` : ""}`, init);

  return parseJsonResponse<ReviewsEnvelope>(res);
}

export async function triggerReview(
  params: TriggerReviewParams,
  init?: RequestInit,
): Promise<TriggerReviewResult> {
  const res = await fetch(`${getApiBaseUrl()}/reviews/trigger`, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify({
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
    }),
  });

  return parseJsonResponse<TriggerReviewResult>(res);
}
