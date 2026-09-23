import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useIncidentReview() {
  const [searchParams, setSearchParams] = useSearchParams();

  const reviewParam = searchParams.get("review");

  let selection = null;
  if (reviewParam) {
    const [type, id] = reviewParam.split(":");
    if (type && id) {
      selection = { type, id };
    }
  }

  const openCandidate = useCallback(
    (id) => {
      setSearchParams({ review: `candidate:${id}` });
    },
    [setSearchParams]
  );

  const openIncident = useCallback(
    (id) => {
      setSearchParams({ review: `incident:${id}` });
    },
    [setSearchParams]
  );

  const clearSelection = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete("review");
      return newParams;
    });
  }, [setSearchParams]);

  return { selection, openCandidate, openIncident, clearSelection };
}
