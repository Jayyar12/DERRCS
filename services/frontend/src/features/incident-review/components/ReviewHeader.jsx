import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const statusBadgeVariants = {
  Pending: "outline",
  Reported: "outline",
  Validated: "default",
  Dispatched: "secondary",
  Active: "destructive",
  Resolved: "default",
  Closed: "secondary",
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

export function ReviewHeader({ data, loading, effectiveStatus }) {
  return (
    <SheetHeader className="mb-4">
      <div className="flex justify-between items-start">
        <div>
          {effectiveStatus && (
            <Badge variant={statusBadgeVariants[effectiveStatus] || "outline"} className="mb-2">
              {effectiveStatus}
            </Badge>
          )}
          <SheetTitle className="text-2xl">
            {loading && !data
              ? "Loading Record..."
              : data?.incidentCode
              ? `${data.incidentCode} (${data.emergencyType})`
              : data
              ? `${data.emergencyType} Candidate`
              : "Incident Review"}
          </SheetTitle>
        </div>
      </div>

      <SheetDescription className="text-sm text-foreground mt-2">
        {data?.createdAt && `Created at ${formatDate(data.createdAt)}`}
        {data?.validatedAt && ` · Validated at ${formatDate(data.validatedAt)}`}
        {data?.dispatchedAt && ` · Dispatched at ${formatDate(data.dispatchedAt)}`}
        {data?.resolvedAt && ` · Resolved at ${formatDate(data.resolvedAt)}`}
        {data?.closedAt && ` · Closed at ${formatDate(data.closedAt)}`}
      </SheetDescription>
    </SheetHeader>
  );
}
