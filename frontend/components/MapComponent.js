import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { message, Button } from 'antd';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue in react-leaflet
// This is necessary because of how Next.js and webpack handle assets
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Component to handle map events like clicks
function LocationMarker({ position, setPosition, readOnly }) {
  const map = useMapEvents({
    click: (e) => {
      if (!readOnly) {
        setPosition(e.latlng);
        message.success(`Location selected: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        Stand location<br />
        Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
      </Popup>
    </Marker>
  );
}

const MapComponent = ({ 
  position, 
  setPosition, 
  readOnly = false,
  height = '500px',
  zoom = 17,
  defaultCenter = { lat: 51.470022, lng: -0.454295 } // Default: London Heathrow
}) => {
  const [mapCenter, setMapCenter] = useState(position || defaultCenter);
  
  // Update map center when position changes
  useEffect(() => {
    if (position) {
      setMapCenter(position);
    }
  }, [position]);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker 
          position={position} 
          setPosition={setPosition}
          readOnly={readOnly} 
        />
      </MapContainer>
      
      {!readOnly && (
        <div style={{ marginTop: '10px' }}>
          <Button 
            type="default" 
            onClick={() => setPosition(null)}
            disabled={!position}
          >
            Clear Location
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapComponent; 