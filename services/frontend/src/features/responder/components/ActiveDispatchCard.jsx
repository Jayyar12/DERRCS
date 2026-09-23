import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function ActiveDispatchCard({ assignment, status, children }) {
  if (!assignment) return null;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <Badge variant="outline" className="text-destructive border-destructive mb-2">{assignment.incident_status}</Badge>
            <h2 className="text-3xl font-bold">{assignment.incident_code}</h2>
            <p className="mt-1 text-muted-foreground">{assignment.emergency_type} &middot; {assignment.severity} severity</p>
          </div>
          <Badge className="text-base py-1 px-3">Unit: {status}</Badge>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="font-bold border-b pb-2">Caller notes</h3>
          {assignment.caller_notes?.length ? (
            <ul className="grid gap-2">
              {assignment.caller_notes.map((note, index) => (
                <li className="rounded-lg bg-muted p-3 text-sm" key={index}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No caller notes provided.</p>
          )}
        </div>

        {children}
      </CardContent>
    </Card>
  );
}
