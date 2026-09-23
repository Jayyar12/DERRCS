import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

export function FieldAssessmentsList({ assessments }) {
  const reports = assessments || [];

  return (
    <div>
      <h3 className="font-bold text-sm mb-3">
        Pre-Hospital Field Care Reports ({reports.length})
      </h3>
      {reports.length === 0 ? (
        <Empty className="border border-dashed py-6">
          <EmptyHeader>
            <EmptyTitle>No field assessments</EmptyTitle>
            <EmptyDescription>Responder assessments will appear here after field care is recorded.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : <div className="flex flex-col gap-3">
        {reports.map((assessment) => (
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
                  {assessment.approximate_age != null ? `(${assessment.approximate_age} yrs)` : ""}{" "}
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
                  <strong>Injuries:</strong> {Array.isArray(assessment.injuries_observed) ? assessment.injuries_observed.join(', ') : assessment.injuries_observed}
                </p>
              )}
              {assessment.interventions_rendered && (
                <p>
                  <strong>Interventions:</strong> {Array.isArray(assessment.interventions_rendered) ? assessment.interventions_rendered.join(', ') : assessment.interventions_rendered}
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
      </div>}
    </div>
  );
}
