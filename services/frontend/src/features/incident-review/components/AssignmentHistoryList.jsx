import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

export function AssignmentHistoryList({ assignments }) {
  if (!assignments || assignments.length === 0) return null;

  return (
    <div>
      <h3 className="font-bold text-sm mb-3">Unit Assignments ({assignments.length})</h3>
      <div className="flex flex-col gap-3">
        {assignments.map((assignment) => (
          <Card key={assignment.id}>
            <CardContent className="p-3 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <strong className="text-sm font-semibold">
                  {assignment.unit_code} ({assignment.unit_type})
                </strong>
                <Badge variant="outline">{assignment.status}</Badge>
              </div>
              {assignment.responder_name && (
                <p className="text-xs text-muted-foreground">
                  Responder: {assignment.responder_name}
                </p>
              )}
              {assignment.notes && (
                <p className="text-xs mt-1 bg-muted p-2 rounded">{assignment.notes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Assigned: {formatDate(assignment.assigned_at)}
                {assignment.completed_at && ` · Completed: ${formatDate(assignment.completed_at)}`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
