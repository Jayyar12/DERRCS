import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/api/client";

export function useIncidentData() {
  const [candidates, setCandidates] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [rawReports, setRawReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef(null);
  const queuedRef = useRef(false);
  const controllerRef = useRef(null);

  const refresh = useCallback(() => {
    // A refresh requested during a read needs one more read after it completes.
    // This prevents an older response from replacing data after a mutation.
    if (inFlightRef.current) {
      queuedRef.current = true;
      return inFlightRef.current;
    }

    const run = async () => {
      if (hasLoadedRef.current) setRefreshing(true);
      setError(null);

      try {
        do {
          queuedRef.current = false;
          const controller = new AbortController();
          controllerRef.current = controller;

          try {
            const [candidatesData, incidentsData, rawReportsData] = await Promise.all([
              api.candidates({ signal: controller.signal }),
              api.incidents({ signal: controller.signal }),
              api.reports({ signal: controller.signal }),
            ]);
            if (!mountedRef.current) return;
            if (!queuedRef.current) {
              setCandidates(candidatesData || []);
              setIncidents(incidentsData || []);
              setRawReports(rawReportsData || []);
              setError(null);
            }
          } catch (requestError) {
            if (!mountedRef.current) return;
            if (requestError.name !== "AbortError" && !queuedRef.current) {
              setError(requestError);
            }
          }
        } while (queuedRef.current && mountedRef.current);
      } finally {
        controllerRef.current = null;
        if (mountedRef.current) {
          hasLoadedRef.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const promise = run();
    inFlightRef.current = promise;
    promise.finally(() => {
      if (inFlightRef.current === promise) inFlightRef.current = null;
    });
    return promise;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    // Responder arrival has no dispatcher socket event, so keep lifecycle status
    // current even when no report or assessment event arrives.
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible' && !inFlightRef.current) refresh();
    };
    const interval = window.setInterval(refreshWhenVisible, 15000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [refresh]);

  return { candidates, incidents, rawReports, loading, refreshing, error, refresh };
}
