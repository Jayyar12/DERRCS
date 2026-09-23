import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function HandoverDebriefSection({ data, isResolvedIncident, isClosedIncident }) {
  if (!isResolvedIncident && !isClosedIncident && !data.handoverSummary) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Handover Debrief</CardTitle>
        <CardDescription>
          {data.handoverSummary || "No handover summary recorded."}
        </CardDescription>
      </CardHeader>
      {data.handoverIsFallback && (
        <CardContent className="pt-0">
          <Alert className="border-warning/40 bg-warning/10 py-2">
            <AlertDescription className="text-xs text-warning">
              Template fallback handover debrief in use.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
