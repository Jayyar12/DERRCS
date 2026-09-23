import { Card, CardContent } from "@/components/ui/card";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

export function FieldAssessmentsList({ assessments }) {
  if (!assessments || assessments.length === 0) return null;

  return (
    <div>
      <h3 className="font-bold text-sm mb-3">
        Pre-Hospital Field Care Reports ({assessments.length})
      </h3>
      <div className="flex flex-col gap-3">
        {assessments.map((assessment) => (
          <Card key={assessment.id}>
            <CardContent className="p-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between font-semibold text-sm">
                <span>Disposition: {assessment.disposition}</span>
                <span className="text-muted-foreground font-normal">
                  {formatDate(assessment.created_at)}
                </span>
              </div>
              {assessment.patient_name && (
                <p>
                  <strong>Patient:</strong> {assessment.patient_name}{" "}
                  {assessment.approximate_age ? `(${assessment.approximate_age} yrs)` : ""}{" "}
                  {assessment.gender ? `· ${assessment.gender}` : ""}
                </p>
              )}
              {assessment.consciousness_level && (
                <p>
                  <strong>Consciousness:</strong> {assessment.consciousness_level}
                </p>
              )}
              {assessment.injuries_observed && (
                <p>
                  <strong>Injuries:</strong> {assessment.injuries_observed}
                </p>
              )}
              {assessment.interventions_rendered && (
                <p>
                  <strong>Interventions:</strong> {assessment.interventions_rendered}
                </p>
              )}
              {assessment.destination_facility && (
                <p>
                  <strong>Facility:</strong> {assessment.destination_facility}
                </p>
              )}
              {assessment.notes && (
                <p className="bg-muted p-2 rounded">
                  <strong>Notes:</strong> {assessment.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
