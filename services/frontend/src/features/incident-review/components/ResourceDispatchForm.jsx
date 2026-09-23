import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup } from "@/components/ui/select";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

export function ResourceDispatchForm({
  isValidatedIncident,
  canDispatch,
  recommendation,
  availableUnitsList,
  selectedUnitId,
  setSelectedUnitId,
  notes,
  setNotes,
  onDispatch,
  submitting,
}) {
  if (!isValidatedIncident) return null;

  return (
    <Card className="border-primary bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resource Dispatch</CardTitle>
        {recommendation && availableUnitsList.some((u) => u.id === (recommendation.unitId || recommendation.recommendedUnitId)) ? (
          <CardDescription className="text-primary mt-1 text-sm font-medium">
            Algorithm recommendation:{" "}
            <strong>{recommendation.unitCode || recommendation.recommendedUnitId}</strong>{" "}
            &middot; estimated {recommendation.estimatedTravelTimeMinutes} minutes.
          </CardDescription>
        ) : recommendation ? (
          <CardDescription className="text-muted-foreground mt-1 text-sm">
            Recommended unit {recommendation.unitCode || recommendation.recommendedUnitId} is currently unavailable. Choose from available units below.
          </CardDescription>
        ) : (
          <CardDescription className="text-muted-foreground mt-1 text-sm">
            Select an available response unit to dispatch.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {canDispatch ? (
          <form onSubmit={onDispatch} className="flex flex-col gap-4">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="unit-select">Response Unit</FieldLabel>
                {availableUnitsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No response units are currently available.
                  </p>
                ) : (
                  <Select
                    value={selectedUnitId}
                    onValueChange={setSelectedUnitId}
                    required
                  >
                    <SelectTrigger id="unit-select" className="bg-background w-full">
                      <SelectValue placeholder="Choose an available unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {availableUnitsList.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.unit_code} &middot; {unit.unit_type}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="dispatch-notes">Dispatch Notes (optional)</FieldLabel>
                <Textarea
                  id="dispatch-notes"
                  className="bg-background"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Special instructions for responders..."
                />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              variant="destructive"
              className="w-full font-bold"
              disabled={submitting || !selectedUnitId}
            >
              {submitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  <span>Dispatching…</span>
                </>
              ) : (
                "Confirm Dispatch"
              )}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only dispatchers can allocate response units.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
