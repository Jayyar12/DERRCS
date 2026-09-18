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

function FitTagoloan({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const boundaryLayer = L.geoJSON(data);
    const bounds = boundaryLayer.getBounds();

    if (!bounds.isValid()) return;

    /*
     * Show the entire Municipality of Tagoloan.
     */
    map.fitBounds(bounds, {
      padding: [30, 30],
    });

    /*
     * Prevent the user from zooming farther
     * out than the whole Tagoloan view.
     */
    const fittedZoom = map.getZoom();

    map.setMinZoom(fittedZoom);

    /*
     * Allow a small amount of space outside
     * Tagoloan but prevent dragging far away.
     */
    const allowedBounds = bounds.pad(0.15);

    map.setMaxBounds(allowedBounds);

    /*
     * Strongly prevents dragging outside
     * the allowed map area.
     */
    map.options.maxBoundsViscosity = 1.0;
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
  if (!data) return null;

  /*
   * Large rectangle covering the map/world.
   */
  const world = [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
  ];

  const holes = [];

  /*
   * Get each barangay polygon and use it
   * as a hole in the white mask.
   */
  data.features?.forEach((feature) => {
    const geometry = feature.geometry;

    if (!geometry) return;

    /*
     * Normal Polygon
     */
    if (geometry.type === "Polygon") {
      const outerRing =
        geometry.coordinates?.[0];

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
      geometry.coordinates.forEach(
        (polygon) => {
          const outerRing = polygon?.[0];

          if (outerRing) {
            holes.push(
              outerRing.map(([lng, lat]) => [
                lat,
                lng,
              ])
            );
          }
        }
      );
    }
  });

  return (
    <Polygon
      positions={[world, ...holes]}
      pathOptions={{
        stroke: false,
        fillColor: "#ffffff",
        fillOpacity: 0.55,
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
        maxZoom={19}
        maxBoundsViscosity={1.0}
        className="h-full w-full rounded-xl"
        aria-label={
          interactive
            ? "Tagoloan map. Select the emergency location."
            : "Tagoloan incident map"
        }
      >

        {/* ==================================
            OPENSTREETMAP BASEMAP
        ================================== */}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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