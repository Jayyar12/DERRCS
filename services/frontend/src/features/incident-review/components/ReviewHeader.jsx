import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/common/StatusBadge";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

export function ReviewHeader({ data, loading, effectiveStatus }) {
  return (
    <SheetHeader className="mb-4 sticky top-0 z-10 bg-card/95 backdrop-blur py-2 border-b border-border/40">
      <div className="flex justify-between items-start">
        <div>
          {effectiveStatus && (
            <div className="mb-2">
              <StatusBadge status={effectiveStatus} />
            </div>
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

export default ReviewHeader;
