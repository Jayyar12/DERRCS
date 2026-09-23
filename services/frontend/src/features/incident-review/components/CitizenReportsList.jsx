import { Card, CardContent } from "@/components/ui/card";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

export function CitizenReportsList({ reports }) {
  if (!reports) return null;

  return (
    <div>
      <h3 className="font-bold text-sm mb-3">
        Citizen Submissions ({reports.length})
      </h3>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports recorded.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
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
                    <img
                      src={report.photo_url}
                      alt="Citizen submission photo"
                      className="max-h-48 rounded object-cover border"
                    />
                  </div>
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
