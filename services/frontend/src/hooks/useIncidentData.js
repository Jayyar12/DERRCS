import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";

export function useIncidentData() {
  const [candidates, setCandidates] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [rawReports, setRawReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [candidatesData, incidentsData, rawReportsData] = await Promise.all([
        api.candidates(),
        api.incidents(),
        api.reports(),
      ]);
      setCandidates(candidatesData || []);
      setIncidents(incidentsData || []);
      setRawReports(rawReportsData || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { candidates, incidents, rawReports, loading, error, refresh };
}
