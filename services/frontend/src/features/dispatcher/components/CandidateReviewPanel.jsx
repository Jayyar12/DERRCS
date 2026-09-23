import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export function CandidateReviewPanel({
  candidates,
  loading,
  selection,
  openCandidate,
  onRefresh,
  children // This is where AudioAlertManager can go
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Candidate Review</CardTitle>
        <Button variant="link" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {children}

        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading live candidates">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : candidates.length === 0 ? (
          <Empty className="border border-dashed py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No pending candidate clusters</EmptyTitle>
              <EmptyDescription>
                Incoming citizen reports will cluster here in real time.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-3">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                role="button"
                tabIndex={0}
                className={`rounded-lg border p-3 hover:border-primary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selection?.kind === 'candidate' && selection?.id === candidate.id
                    ? 'border-primary ring-1 ring-primary'
                    : ''
                }`}
                onClick={() => openCandidate(candidate.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCandidate(candidate.id);
                  }
                }}
              >
                <strong className="block">{candidate.emergency_type}</strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {candidate.report_count} report
                  {candidate.report_count === 1 ? '' : 's'} &middot;{' '}
                  {formatDate(candidate.created_at)}
                </span>
                <span className="mt-2 block text-sm line-clamp-2">
                  {candidate.latest_summary || 'Summary is being prepared.'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
