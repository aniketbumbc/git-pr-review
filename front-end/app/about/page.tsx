import { NavBar } from "@/app/components/nav-bar";
import { PipelineFlow } from "./pipeline-flow";

const TECH_STACK = [
  "Next.js",
  "Express",
  "Inngest",
  "Octokit",
  "OpenAI Agents SDK",
  "PostgreSQL",
  "Tailwind CSS",
];

export default function AboutPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar active="about" />
      <div className="mx-auto max-w-[1240px] px-8 pb-16">
        <div className="my-[26px] max-w-[640px]">
          <h1 className="m-0 text-2xl font-medium tracking-tight">About Auto ReviewPR</h1>
          <p className="mt-1.5 text-[13.5px] text-fg/55">
            An automated pull-request reviewer built on Inngest&apos;s durable, event-driven
            functions — every review is a real, retryable workflow, not a black box.
          </p>
        </div>

        <div className="mb-8 rounded-lg border border-divider bg-surface p-5">
          <h6 className="m-0 text-[11px] uppercase tracking-wide text-accent-500">
            What it is
          </h6>
          <p className="mt-2.5 max-w-[72ch] text-[13.5px] leading-relaxed text-fg/70">
            The bot listens for a &quot;review this PR&quot; event — either a real GitHub
            webhook or a manual trigger from this dashboard — pulls the pull request&apos;s
            info and diff straight from GitHub, sends it to an AI agent for review, and
            posts the agent&apos;s feedback back onto the pull request as a review comment.
            Every stage runs as its own durable Inngest step, so a flaky network call or a
            rate-limited API only retries that one step, never the whole run.
          </p>
        </div>

        <div className="mb-8 rounded-lg border border-divider bg-surface p-5">
          <h6 className="m-0 text-[11px] uppercase tracking-wide text-accent-500">
            How it works
          </h6>
          <p className="mt-2.5 max-w-[72ch] text-[13.5px] leading-relaxed text-fg/70">
            End-to-end flow, from PR event to a saved, queryable review:
          </p>
          <div className="mt-5">
            <PipelineFlow />
          </div>
        </div>

        <div className="rounded-lg border border-divider bg-surface p-5">
          <h6 className="m-0 text-[11px] uppercase tracking-wide text-accent-500">
            Built with
          </h6>
          <div className="mt-3 flex flex-wrap gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-divider px-2.5 py-1 text-[12px] text-fg/70"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
