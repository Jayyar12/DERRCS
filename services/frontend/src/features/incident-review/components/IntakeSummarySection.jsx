import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function IntakeSummarySection({ data }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Intake Summary</CardTitle>
        <CardDescription>
          {data.latestSummary || "No AI summary is available yet. Review the report details below."}
        </CardDescription>
      </CardHeader>
      {data.summaryIsFallback && (
        <CardContent className="pt-0">
          <Alert className="border-warning/40 bg-warning/10 py-2">
            <AlertDescription className="text-xs text-warning">
              Template fallback summary in use.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
