import { useState, useCallback, useEffect, useRef } from "react";

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  const requestLocation = useCallback(() => {
    const currentRequest = ++requestId.current;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      setCoordinates(null);
      return Promise.resolve(null);
    }

    setLoading(true);
    setError(null);
    setCoordinates(null);

    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (currentRequest !== requestId.current) {
              resolve(null);
              return;
            }
            const latitude = Number(position.coords.latitude);
            const longitude = Number(position.coords.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
              latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
              setError("GPS returned invalid coordinates. Select the location on the map.");
              setLoading(false);
              resolve(null);
              return;
            }
            const nextCoordinates = { lat: latitude, lng: longitude };
            setCoordinates(nextCoordinates);
            setLoading(false);
            resolve(nextCoordinates);
          },
          (err) => {
            if (currentRequest !== requestId.current) {
              resolve(null);
              return;
            }
            const messages = {
              1: "GPS permission was denied. Select the location on the map.",
              2: "GPS location is unavailable. Select the location on the map.",
              3: "GPS timed out. Try again or select the location on the map.",
            };
            setError(messages[err?.code] || err?.message || "Failed to retrieve location.");
            setLoading(false);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } catch {
        if (currentRequest === requestId.current) {
          setError("Unable to request GPS location. Select the location on the map.");
          setLoading(false);
        }
        resolve(null);
      }
    });
  }, []);

  const clearLocation = useCallback(() => {
    // getCurrentPosition cannot be cancelled; ignore callbacks from an old request.
    requestId.current += 1;
    setCoordinates(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    coordinates,
    latitude: coordinates?.lat ?? null,
    longitude: coordinates?.lng ?? null,
    loading,
    error,
    requestLocation,
    clearLocation,
  };
}
