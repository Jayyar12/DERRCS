import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function IncidentClosureAction({ canClose, onClose, submitting }) {
  if (!canClose) return null;

  return (
    <Card className="border-success/40 bg-success/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Incident Closure</CardTitle>
        <CardDescription>
          Field operations and assessment are complete. Review all records before final closure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="default"
          className="w-full font-bold"
          size="lg"
          onClick={onClose}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Spinner data-icon="inline-start" />
              <span>Closing Incident…</span>
            </>
          ) : (
            "Close Incident After Review"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
