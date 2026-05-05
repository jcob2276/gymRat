import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Definicja "Miejsc Mocy" - możesz tu dodać swoje współrzędne
const POI = [
  { name: 'Siłownia', lat: 52.2297, lng: 21.0122, radius: 200 }, // Przykładowe współrzędne (Warszawa Centrum)
  { name: 'Dom', lat: 52.2396, lng: 21.0122, radius: 100 },
];

export default function LocationTracker({ session }) {
  const lastPos = useRef(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const trackLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Sprawdź czy pozycja zmieniła się znacząco (> 100m) lub minęło dużo czasu
          const dist = lastPos.current ? getDistance(lastPos.current.lat, lastPos.current.lng, latitude, longitude) : 999;

          if (dist > 100) {
            lastPos.current = { lat: latitude, lng: longitude };

            // Rozpoznaj czy jesteśmy w POI
            const currentPOI = POI.find(p => 
              getDistance(p.lat, p.lng, latitude, longitude) < p.radius
            );

            // Zapisz do bazy
            await supabase.from('location_history').insert({
              user_id: session.user.id,
              latitude,
              longitude,
              accuracy,
              place_name: currentPOI ? currentPOI.name : null
            });
            
            console.log('📍 Pozycja zapisana:', currentPOI ? currentPOI.name : 'Nieznane miejsce');
          }
        },
        (error) => console.warn('Błąd lokalizacji:', error.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Śledź co 5 minut, gdy aplikacja jest otwarta
    const interval = setInterval(trackLocation, 5 * 60 * 1000);
    trackLocation(); // Pierwszy pomiar od razu

    return () => clearInterval(interval);
  }, [session]);

  // Funkcja Haversine do liczenia dystansu w metrach
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // promień ziemi w metrach
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  return null; // Komponent jest niewidoczny
}
