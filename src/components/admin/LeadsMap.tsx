'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Loads the Google Maps JS API once (idempotent across mounts) and resolves
// when window.google.maps is ready. The key is domain-restricted to
// app.techpulse.dev and locked to Maps JavaScript API, so exposing it in the
// browser bundle is safe.
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

let mapsLoaderPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  // already loaded
  if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) {
    return Promise.resolve();
  }
  if (mapsLoaderPromise) return mapsLoaderPromise;

  mapsLoaderPromise = new Promise<void>((resolve, reject) => {
    if (!MAPS_KEY) {
      reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_KEY not set'));
      return;
    }
    const existing = document.getElementById('gmaps-js');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Maps script failed')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-js';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Maps script failed to load'));
    document.head.appendChild(script);
  });
  return mapsLoaderPromise;
}

export interface MapShop {
  id: string;
  name: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  enrichment_status: string | null;
}

// Pin color by enrichment status: green = has email, amber = pending, gray = no email.
function pinColor(s: MapShop): string {
  if (s.email) return '#16a34a';        // green
  if ((s.enrichment_status || '') === 'pending') return '#d97706'; // amber
  return '#9ca3af';                      // gray
}

export default function LeadsMap({ shops, expanded = false }: { shops: MapShop[]; expanded?: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapObj = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markers = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindow = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  const withCoords = shops.filter(
    (s) => s.latitude != null && s.longitude != null
  );

  const draw = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    if (!g?.maps || !mapRef.current) return;

    if (!mapObj.current) {
      mapObj.current = new g.maps.Map(mapRef.current, {
        center: { lat: 33.79, lng: -84.41 }, // metro Atlanta
        zoom: 9,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      infoWindow.current = new g.maps.InfoWindow();
    }

    // Clear old markers
    for (const m of markers.current) m.setMap(null);
    markers.current = [];

    if (withCoords.length === 0) return;

    const bounds = new g.maps.LatLngBounds();
    for (const s of withCoords) {
      const pos = { lat: Number(s.latitude), lng: Number(s.longitude) };
      const marker = new g.maps.Marker({
        position: pos,
        map: mapObj.current,
        title: s.name || '',
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: pinColor(s),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 6,
        },
      });
      marker.addListener('click', () => {
        const html = `
          <div style="font-family:system-ui;font-size:13px;max-width:240px">
            <div style="font-weight:600;margin-bottom:2px">${s.name || '—'}</div>
            <div style="color:#666">${s.address || ''}</div>
            <div style="color:#666">${[s.city, s.county].filter(Boolean).join(', ')}</div>
            ${s.phone ? `<div style="margin-top:4px">${s.phone}</div>` : ''}
            ${s.email ? `<div><a href="mailto:${s.email}">${s.email}</a></div>` : '<div style="color:#999">No email yet</div>'}
          </div>`;
        infoWindow.current.setContent(html);
        infoWindow.current.open(mapObj.current, marker);
      });
      markers.current.push(marker);
      bounds.extend(pos);
    }
    // Fit to the shops we have, unless there's only one (avoid over-zoom).
    if (withCoords.length > 1) {
      mapObj.current.fitBounds(bounds);
    } else {
      mapObj.current.setCenter(bounds.getCenter());
      mapObj.current.setZoom(13);
    }
  }, [withCoords]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        setStatus('ready');
        draw();
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setErrMsg(e instanceof Error ? e.message : 'Map failed to load');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw when the shop list changes (filters, new discovery)
  useEffect(() => {
    if (status === 'ready') draw();
  }, [status, draw]);

  // When the container height changes (expand/collapse), tell Google Maps to
  // resize so it repaints tiles into the new area and re-centers on the shops.
  useEffect(() => {
    if (status !== 'ready' || !mapObj.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    const t = setTimeout(() => {
      g.maps.event.trigger(mapObj.current, 'resize');
      draw();
    }, 60); // let the CSS height transition settle first
    return () => clearTimeout(t);
  }, [expanded, status, draw]);

  if (status === 'error') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-red-600 text-sm">
        Map failed to load: {errMsg}
        {!MAPS_KEY && <div className="text-gray-500 mt-2">NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set on the web app.</div>}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
        <span>{withCoords.length} of {shops.length} shops mapped</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Dot c="#16a34a" /> Has email</span>
          <span className="flex items-center gap-1"><Dot c="#d97706" /> Pending</span>
          <span className="flex items-center gap-1"><Dot c="#9ca3af" /> No email</span>
        </span>
      </div>
      <div
        ref={mapRef}
        style={{ height: expanded ? 'calc(100vh - 220px)' : 560, width: '100%' }}
      />
      {status === 'loading' && (
        <div className="p-3 text-center text-xs text-gray-400">Loading map…</div>
      )}
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 9999, background: c }} />;
}
