import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polygon,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import tagoloanUrl from "../../assets/geo/tagoloan.geojson?url";


/* ==========================================
   FIT AND RESTRICT MAP TO TAGOLOAN
========================================== */

function MapResizeObserver() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const handleResize = () => {
      map.invalidateSize();
    };

    handleResize();
    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 350);
    const t3 = setTimeout(handleResize, 700);

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(container);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
}

function FitTagoloan({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const boundaryLayer = L.geoJSON(data);
    const bounds = boundaryLayer.getBounds();

    if (!bounds.isValid()) return;

    const applyFit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [30, 30],
        animate: false,
      });

      const fittedZoom = map.getBoundsZoom(bounds, false, [30, 30]);
      map.setMinZoom(Math.max(10, fittedZoom - 2));

      const allowedBounds = bounds.pad(0.35);
      map.setMaxBounds(allowedBounds);
      map.options.maxBoundsViscosity = 0.8;
    };

    applyFit();
    const t1 = setTimeout(applyFit, 150);
    const t2 = setTimeout(applyFit, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data, map]);

  return null;
}


/* ==========================================
   OUTSIDE TAGOLOAN MASK
========================================== */

/*
 * This creates the faded white area outside
 * the Municipality of Tagoloan.
 *
 * The Tagoloan barangay polygons become holes,
 * so the actual municipality remains visible.
 */
function OutsideTagoloanMask({ data }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => map.off("zoomend", handleZoom);
  }, [map]);

  // When zoomed in to street level, the viewport is completely within Tagoloan.
  // Rendering an inverted global mask at high zoom causes SVG coordinate overflow
  // and clipping inversion bugs that black out the screen.
  if (!data || zoom >= 15) return null;

  /*
   * Regional bounding box covering Tagoloan's vicinity (Misamis Oriental)
   * instead of the entire planet [-90, -180] to [90, 180], preventing multi-million
   * pixel SVG coordinate overflow in Leaflet's path renderer.
   */
  const world = [
    [7.5, 123.5],
    [7.5, 126.0],
    [9.5, 126.0],
    [9.5, 123.5],
  ];

  const holes = [];

  /*
   * Get each barangay polygon and use it
   * as a hole in the mask.
   */
  data.features?.forEach((feature) => {
    const geometry = feature.geometry;

    if (!geometry) return;

    /*
     * Normal Polygon
     */
    if (geometry.type === "Polygon") {
      const outerRing = geometry.coordinates?.[0];

      if (outerRing) {
        holes.push(
          outerRing.map(([lng, lat]) => [
            lat,
            lng,
          ])
        );
      }
    }

    /*
     * MultiPolygon
     */
    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        const outerRing = polygon?.[0];

        if (outerRing) {
          holes.push(
            outerRing.map(([lng, lat]) => [
              lat,
              lng,
            ])
          );
        }
      });
    }
  });

  return (
    <Polygon
      positions={[world, ...holes]}
      pathOptions={{
        stroke: false,
        fillColor: "#09090b",
        fillOpacity: 0.65,
      }}
      interactive={false}
    />
  );
}


/* ==========================================
   CITIZEN MAP CLICK
========================================== */

/*
 * Allows citizens to click/tap the map
 * to select the exact emergency location.
 */
function MapClickHandler({
  enabled,
  onLocationChange,
}) {
  useMapEvents({
    click(event) {
      if (!enabled) return;

      onLocationChange?.({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}


/* ==========================================
   MAIN TAGOLOAN MAP
========================================== */

function TagoloanMap({
  markers = [],
  selectedPoint,
  onLocationChange,
  onMarkerSelect,
  interactive = false,
  className = "",
}) {
  const [tagoloan, setTagoloan] =
    useState(null);

  const [error, setError] =
    useState(null);


  /* ========================================
     LOAD LOCAL TAGOLOAN GEOJSON
  ======================================== */

  useEffect(() => {
    fetch(tagoloanUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load Tagoloan GeoJSON."
          );
        }

        return response.json();
      })

      .then((data) => {
        setTagoloan(data);
      })

      .catch((loadError) => {
        console.error(
          "Tagoloan GeoJSON error:",
          loadError
        );

        setError(loadError.message);
      });
  }, []);


  /* ========================================
     GEOJSON ERROR
  ======================================== */

  if (error) {
    return (
      <div className="error-screen">
        <h2>Map Error</h2>

        <p>
          {error}
        </p>
      </div>
    );
  }


  /* ========================================
     MAP
  ======================================== */

  return (
    <div
      className={`map-page ${className}`}
    >
      <MapContainer
        center={[8.5391, 124.7538]}
        zoom={13}
        maxZoom={20}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        aria-label={
          interactive
            ? "Tagoloan map. Select the emergency location."
            : "Tagoloan incident map"
        }
      >
        <MapResizeObserver />

        {/* ==================================
            OPENSTREETMAP BASEMAP
        ================================== */}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={20}
          maxNativeZoom={19}
        />


        {/* ==================================
            OUTSIDE TAGOLOAN MASK
        ================================== */}

        {tagoloan && (
          <OutsideTagoloanMask
            data={tagoloan}
          />
        )}


        {/* ==================================
            TAGOLOAN BARANGAY BOUNDARIES
        ================================== */}

        {tagoloan && (
          <GeoJSON
            data={tagoloan}

            style={() => ({
              /*
               * Thin black barangay borders.
               */
              color: "#000000",
              weight: 0.8,
              opacity: 0.8,

              /*
               * Light blue fill inside
               * Tagoloan.
               */
              fillColor: "#3b82f6",
              fillOpacity: 0.06,
            })}

            onEachFeature={(
              feature,
              layer
            ) => {
              /*
               * Get barangay name from
               * GeoJSON properties.
               */
              const barangayName =
                feature.properties?.adm4_en ||
                feature.properties?.name ||
                feature.properties?.NAME_4 ||
                "Barangay";


              /* ==============================
                 BARANGAY HOVER NAME
              ============================== */

              layer.bindTooltip(
                barangayName,
                {
                  sticky: true,
                  direction: "top",
                }
              );


              /* ==============================
                 REMOVE ORANGE RECTANGLE
              ============================== */

              /*
               * When Leaflet creates the SVG
               * polygon, remove its keyboard
               * focus behavior.
               */
              layer.on("add", () => {
                const element =
                  layer.getElement?.();

                if (element) {
                  element.setAttribute(
                    "tabindex",
                    "-1"
                  );

                  element.style.outline =
                    "none";

                  element.style.boxShadow =
                    "none";
                }
              });


              /*
               * If the barangay is clicked,
               * immediately remove focus.
               *
               * This prevents the orange
               * rectangle/outline from
               * remaining around it.
               */
              layer.on("click", () => {
                const element =
                  layer.getElement?.();

                if (element) {
                  element.blur?.();

                  element.style.outline =
                    "none";

                  element.style.boxShadow =
                    "none";
                }
              });
            }}
          />
        )}


        {/* ==================================
            FIT + RESTRICT TO TAGOLOAN
        ================================== */}

        {tagoloan && (
          <FitTagoloan
            data={tagoloan}
          />
        )}


        {/* ==================================
            CITIZEN LOCATION SELECTION
        ================================== */}

        <MapClickHandler
          enabled={interactive}
          onLocationChange={
            onLocationChange
          }
        />


        {/* ==================================
            SELECTED EMERGENCY LOCATION
        ================================== */}

        {selectedPoint && (
          <CircleMarker
            center={[
              selectedPoint.latitude,
              selectedPoint.longitude,
            ]}

            radius={10}

            pathOptions={{
              color: "#b91c1c",
              fillColor: "#ef4444",
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Popup>
              Emergency location
            </Popup>
          </CircleMarker>
        )}


        {/* ==================================
            INCIDENT / CANDIDATE MARKERS
        ================================== */}

        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}

            center={[
              marker.latitude,
              marker.longitude,
            ]}

            radius={
              marker.selected
                ? 12
                : 9
            }

            pathOptions={{
              color:
                marker.color ||
                "#1d4ed8",

              fillColor:
                marker.color ||
                "#2563eb",

              fillOpacity: 0.85,

              weight:
                marker.selected
                  ? 4
                  : 2,
            }}

            eventHandlers={{
              click: () =>
                onMarkerSelect?.(
                  marker
                ),
            }}
          >
            <Popup>
              <strong>
                {marker.title}
              </strong>

              <br />

              {marker.description}
            </Popup>
          </CircleMarker>
        ))}

      </MapContainer>
    </div>
  );
}

export default TagoloanMap;