import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

function ReportPhoto({ source }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <p className="text-xs text-muted-foreground" role="status">Submitted photo is unavailable.</p>;
  return <img src={source} alt="Citizen submission photo" className="max-h-48 rounded object-cover border" onError={() => setFailed(true)} />;
}

export function CitizenReportsList({ reports }) {
  const submissions = reports || [];

  return (
    <div>
      <h3 className="font-bold text-sm mb-3">
        Citizen Submissions ({submissions.length})
      </h3>
      {submissions.length === 0 ? (
        <Empty className="border border-dashed py-6">
          <EmptyHeader>
            <EmptyTitle>No citizen reports</EmptyTitle>
            <EmptyDescription>Linked citizen submissions will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-3 flex flex-col gap-2">
                <p className="text-sm">{report.description || "No narrative supplied."}</p>

                {report.standardized_answers &&
                  typeof report.standardized_answers === "object" &&
                  Object.keys(report.standardized_answers).length > 0 && (
                    <div className="bg-muted/50 p-2 rounded text-xs flex flex-col gap-1">
                      <span className="font-semibold text-muted-foreground">
                        Structured answers:
                      </span>
                      {Object.entries(report.standardized_answers).map(([q, a]) => (
                        <div key={q} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{q}:</span>
                          <span className="font-medium text-right">
                            {typeof a === "boolean" ? (a ? "Yes" : "No") : String(a)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                {report.photo_url && (
                  <div className="mt-1">
                    <ReportPhoto key={report.photo_url} source={report.photo_url} />
                  </div>
                )}

                {report.emergency_location?.coordinates?.length >= 2 && (
                  <p className="text-xs text-muted-foreground">
                    Emergency location: {report.emergency_location.coordinates[1]}, {report.emergency_location.coordinates[0]}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Submitted: {formatDate(report.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
