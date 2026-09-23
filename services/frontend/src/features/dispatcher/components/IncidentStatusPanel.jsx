import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  Reported: 'bg-warning text-warning-foreground',
  Validated: 'bg-primary text-primary-foreground',
  Dispatched: 'bg-secondary text-secondary-foreground',
  Active: 'bg-destructive text-destructive-foreground',
  Resolved: 'bg-success text-success-foreground',
  Closed: 'bg-muted text-muted-foreground',
};

export function IncidentStatusPanel({
  incidents,
  loading,
  selection,
  openIncident,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Incident Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading incidents">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : incidents.length === 0 ? (
          <Empty className="border border-dashed py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Activity />
              </EmptyMedia>
              <EmptyTitle>No active incidents</EmptyTitle>
              <EmptyDescription>
                Validated emergencies will appear here for response tracking.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                role="button"
                tabIndex={0}
                className={`rounded-lg border p-3 hover:border-primary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selection?.kind === 'incident' && selection?.id === incident.id
                    ? 'border-primary ring-1 ring-primary'
                    : ''
                }`}
                onClick={() => openIncident(incident.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openIncident(incident.id);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">{incident.incident_code}</strong>
                  <Badge className={statusColors[incident.status]}>
                    {incident.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {incident.emergency_type} &middot; {incident.report_count || 0} reports
                </p>
                <span className="mt-2 text-xs text-primary font-medium inline-block">
                  Review details &rarr;
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
