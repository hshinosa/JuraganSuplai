'use client';

/**
 * Live Map Component
 * Shows courier location on a Leaflet map with real-time updates
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue in Next.js
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const courierIcon = createIcon('#10b981'); // emerald
const supplierIcon = createIcon('#3b82f6'); // blue
const buyerIcon = createIcon('#f59e0b'); // amber

// Component to update map center when courier moves
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

interface Location {
  lat: number;
  lng: number;
  label?: string;
}

interface LiveMapProps {
  courierLocation?: Location;
  supplierLocation?: Location;
  buyerLocation: Location;
  showRoute?: boolean;
  height?: string;
}

export function LiveMap({
  courierLocation,
  supplierLocation,
  buyerLocation,
  showRoute = true,
  height = '400px',
}: LiveMapProps) {
  const [mapReady, setMapReady] = useState(false);

  // Determine center based on available locations
  const center: [number, number] = courierLocation
    ? [courierLocation.lat, courierLocation.lng]
    : supplierLocation
    ? [supplierLocation.lat, supplierLocation.lng]
    : [buyerLocation.lat, buyerLocation.lng];

  // Build route path
  const routePath: [number, number][] = [];
  if (supplierLocation) {
    routePath.push([supplierLocation.lat, supplierLocation.lng]);
  }
  if (courierLocation) {
    routePath.push([courierLocation.lat, courierLocation.lng]);
  }
  routePath.push([buyerLocation.lat, buyerLocation.lng]);

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <div 
        style={{ height }} 
        className="bg-slate-100 rounded-lg flex items-center justify-center"
      >
        <p className="text-slate-500">Memuat peta...</p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {courierLocation && <MapUpdater center={[courierLocation.lat, courierLocation.lng]} />}

        {/* Route line */}
        {showRoute && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            color="#10b981"
            weight={3}
            dashArray="10, 10"
            opacity={0.7}
          />
        )}

        {/* Supplier marker */}
        {supplierLocation && (
          <Marker
            position={[supplierLocation.lat, supplierLocation.lng]}
            icon={supplierIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold">📦 Supplier</p>
                <p className="text-xs text-slate-500">{supplierLocation.label || 'Lokasi Pengambilan'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Courier marker */}
        {courierLocation && (
          <Marker
            position={[courierLocation.lat, courierLocation.lng]}
            icon={courierIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold">🛵 Kurir</p>
                <p className="text-xs text-slate-500">{courierLocation.label || 'Sedang mengantar'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Buyer marker */}
        <Marker
          position={[buyerLocation.lat, buyerLocation.lng]}
          icon={buyerIcon}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold">📍 Tujuan</p>
              <p className="text-xs text-slate-500">{buyerLocation.label || 'Alamat Pengiriman'}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
