import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { Icon } from '@/components/common/Icon';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORY_KEYS, CATEGORY_META } from '@/lib/constants';
import { isValidNepalCoordinate, NEPAL_DEFAULT_CENTER, NEPAL_DEFAULT_ZOOM, NEPAL_MAX_BOUNDS, centerOf } from '@/lib/geoUtils';
import type { Complaint, ComplaintCategory, ComplaintStatus, Role } from '@/types';

export interface CivicMapProps {
  mode?: 'view' | 'picker';
  complaints?: Complaint[];
  selectedComplaintId?: string;
  onSelectComplaint?: (complaint: Complaint) => void;
  portalType?: Role | 'palika' | 'district' | 'province';
  // Picker props
  coordinates?: { lat: number; lng: number };
  onChangeCoordinates?: (coords: { lat: number; lng: number }) => void;
  isDetecting?: boolean;
  addressLabel?: string;
  // Common
  height?: string;
  defaultZoom?: number;
  initialCenter?: [number, number];
  showFilters?: boolean;
  showLegend?: boolean;
  activeCategoryFilter?: ComplaintCategory | 'all';
  onFilterChange?: (cat: ComplaintCategory | 'all') => void;
  activeStatusFilter?: ComplaintStatus | 'critical' | 'all';
  onStatusFilterChange?: (st: ComplaintStatus | 'critical' | 'all') => void;
  searchQuery?: string;
}

// Safely retrieve Geoapify API Key from environment (supports VITE_GEOAPIFY_API_KEY and GEOAPIFY_API_KEY)
const geoapifyApiKey: string =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_GEOAPIFY_API_KEY || import.meta.env.GEOAPIFY_API_KEY)
    : undefined) || '';

export function CivicMap({
  mode = 'view',
  complaints = [],
  selectedComplaintId,
  onSelectComplaint,
  portalType = 'citizen',
  coordinates,
  onChangeCoordinates,
  isDetecting = false,
  addressLabel: _addressLabel,
  height = '100%',
  defaultZoom = 13,
  initialCenter,
  showFilters = true,
  showLegend = true,
  activeCategoryFilter: externalFilter,
  onFilterChange,
  activeStatusFilter: externalStatusFilter,
  onStatusFilterChange,
  searchQuery,
}: CivicMapProps) {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  // Leaflet handlers are bound once, so they read the latest callback through a ref.
  const onChangeCoordinatesRef = useRef(onChangeCoordinates);
  onChangeCoordinatesRef.current = onChangeCoordinates;
  const { pick } = useLanguage();

  const [internalCategoryFilter, setInternalCategoryFilter] = useState<ComplaintCategory | 'all'>('all');
  const [internalStatusFilter, setInternalStatusFilter] = useState<ComplaintStatus | 'critical' | 'all'>('all');
  const activeCategory = externalFilter !== undefined ? externalFilter : internalCategoryFilter;
  const activeStatus = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [mapInitError, setMapInitError] = useState(false);
  const [_tileState, setTileState] = useState<'geoapify' | 'fallback'>(geoapifyApiKey ? 'geoapify' : 'fallback');
  const hasFallenBackRef = useRef(false);

  // Set active complaint if selectedComplaintId is passed
  useEffect(() => {
    if (selectedComplaintId) {
      const match = complaints.find(c => c.id === selectedComplaintId || c.referenceId === selectedComplaintId);
      if (match) setActiveComplaint(match);
    }
  }, [selectedComplaintId, complaints]);

  // Valid geographic complaints with valid numeric lat & lng inside Nepal
  const validGeoComplaints = useMemo(() => {
    return complaints.filter(c => isValidNepalCoordinate(c.location?.lat, c.location?.lng));
  }, [complaints]);

  // Dynamic filter list with deduplication by referenceId
  const filteredComplaints = useMemo(() => {
    const seenRefs = new Set<string>();
    const uniqueComplaints = validGeoComplaints.filter(c => {
      if (seenRefs.has(c.referenceId)) return false;
      seenRefs.add(c.referenceId);
      return true;
    });

    return uniqueComplaints.filter(c => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (activeStatus === 'critical') {
        if (c.priority !== 'critical' && c.status !== 'escalated') return false;
      } else if (activeStatus !== 'all' && c.status !== activeStatus) {
        return false;
      }
      if (searchQuery && searchQuery.trim()) {
        const s = searchQuery.toLowerCase().trim();
        const matches =
          c.title.toLowerCase().includes(s) ||
          c.referenceId.toLowerCase().includes(s) ||
          c.jurisdictionName.toLowerCase().includes(s) ||
          c.districtName.toLowerCase().includes(s) ||
          (c.wardLabel && c.wardLabel.toLowerCase().includes(s));
        if (!matches) return false;
      }
      return true;
    });
  }, [validGeoComplaints, activeCategory, activeStatus, searchQuery]);

  // Default center: explicit center, picked point, the complaints shown, or the whole of Nepal
  const defaultCenter = useMemo<[number, number]>(() => {
    if (initialCenter) return initialCenter;
    if (coordinates?.lat && coordinates?.lng) return [coordinates.lat, coordinates.lng];
    if (validGeoComplaints.length > 0) return centerOf(validGeoComplaints.map(c => c.location));
    return NEPAL_DEFAULT_CENTER;
  }, [initialCenter, coordinates, validGeoComplaints]);
  const hasFocus = !!initialCenter || !!(coordinates?.lat && coordinates?.lng) || validGeoComplaints.length > 0;
  const startZoom = hasFocus ? defaultZoom : NEPAL_DEFAULT_ZOOM;

  // 1. Initialize Leaflet Map Instance with Geoapify Tile Layer and robust error handling
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: startZoom,
        maxBounds: NEPAL_MAX_BOUNDS,
        minZoom: 6,
        zoomControl: false,
        attributionControl: true,
      });

      // Geoapify Carto Tile Layer (or OpenStreetMap fallback if API key is not configured)
      const primaryTileUrl = geoapifyApiKey
        ? `https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=${geoapifyApiKey}`
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      const primaryAttribution = geoapifyApiKey
        ? 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

      const tileLayer = L.tileLayer(primaryTileUrl, {
        maxZoom: 20,
        attribution: primaryAttribution,
      });

      // Error handler: If Geoapify tile request fails (e.g. invalid key or network issue), seamlessly fallback to OSM
      tileLayer.on('tileerror', () => {
        if (geoapifyApiKey && !hasFallenBackRef.current) {
          hasFallenBackRef.current = true;
          setTileState('fallback');
          tileLayer.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
        }
      });

      tileLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Handle Map Click in Picker Mode
      if (mode === 'picker') {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          onChangeCoordinatesRef.current?.({ lat: newLat, lng: newLng });
        });
      }

      // Invalidate size on load/render for accurate tile sizing
      setTimeout(() => {
        map.invalidateSize();
      }, 150);

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch {
      setMapInitError(true);
    }
  }, []);

  // 2. Handle Picker Coordinates updates
  useEffect(() => {
    if (mode !== 'picker' || !coordinates || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const { lat, lng } = coordinates;

    if (!pickerMarkerRef.current) {
      const pickerIcon = L.divIcon({
        className: 'leaflet-civic-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #b3261e; color: #ffffff; display: flex; align-items: center; justify-content: center; font-family: 'Material Symbols Outlined'; font-size: 22px; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(179,38,30,0.5);">
              location_on
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #b3261e; margin-top: -2px;"></div>
            <div style="width: 12px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 2px;"></div>
          </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 44],
      });

      const marker = L.marker([lat, lng], { icon: pickerIcon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeCoordinatesRef.current?.({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6)),
        });
      });
      pickerMarkerRef.current = marker;
    } else {
      pickerMarkerRef.current.setLatLng([lat, lng]);
    }

    map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
  }, [coordinates?.lat, coordinates?.lng, mode]);

  // 3. Render Real Complaint Markers and Auto-Fit Bounds
  useEffect(() => {
    if (mode !== 'view' || !mapInstanceRef.current || !markersLayerRef.current) return;

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    filteredComplaints.forEach(c => {
      const lat = Number(c.location.lat);
      const lng = Number(c.location.lng);

      bounds.extend([lat, lng]);

      const isCritical = c.priority === 'critical' || c.status === 'escalated';
      const isResolved = c.status === 'resolved' || c.status === 'closed';
      const isInProgress = c.status === 'in_progress';

      const pinBg = isResolved ? '#059669' : isCritical ? '#dc2626' : isInProgress ? '#d97706' : '#0284c7';
      const pinIconName = getCategoryIconName(c.category);

      const customIcon = L.divIcon({
        className: 'leaflet-civic-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${pinBg}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-family: 'Material Symbols Outlined'; font-size: 18px; border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">
              ${pinIconName}
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${pinBg}; margin-top: -1px;"></div>
            <div style="background: rgba(255,255,255,0.95); padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: 700; color: #1e293b; border: 1px solid #cbd5e1; margin-top: 1px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
              ${c.referenceId}
            </div>
          </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 44],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.bindTooltip(`
        <div style="font-size: 11px; font-weight: bold; color: #0f172a; line-height: 1.3;">
          <span style="color: #0284c7; font-family: monospace;">${c.referenceId}</span>: ${c.title}
          <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">
            ${c.category.toUpperCase()} • ${c.status.toUpperCase()} • ${c.jurisdictionName} (${c.districtName})
          </div>
          <div style="font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 1px;">
            ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
        </div>
      `, { direction: 'top', offset: [0, -42], opacity: 0.96 });

      marker.on('click', () => {
        setActiveComplaint(c);
        if (onSelectComplaint) onSelectComplaint(c);
      });
      markersGroup.addLayer(marker);
    });

    // Fit bounds if valid coordinates exist and map is initialized
    if (bounds.isValid() && filteredComplaints.length > 0) {
      if (filteredComplaints.length === 1) {
        map.setView(bounds.getCenter(), Math.max(14, defaultZoom), { animate: true });
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [filteredComplaints, mode]);

  // Recenter helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(defaultCenter, startZoom, { animate: true });
    setActiveComplaint(null);
  };

  const handleCategoryFilterClick = (cat: ComplaintCategory | 'all') => {
    if (onFilterChange) {
      onFilterChange(cat);
    } else {
      setInternalCategoryFilter(cat);
    }
  };

  const handleStatusFilterClick = (st: ComplaintStatus | 'critical' | 'all') => {
    if (onStatusFilterChange) {
      onStatusFilterChange(st);
    } else {
      setInternalStatusFilter(st);
    }
  };

  // Resolve detail URL based on portal
  const handleOpenDetails = (c: Complaint) => {
    if (onSelectComplaint) {
      onSelectComplaint(c);
      return;
    }
    const portal = portalType || 'citizen';
    const base =
      portal === 'ward_officer' || portal === 'palika_officer' || portal === 'palika' ? '/palika'
      : portal === 'district_officer' || portal === 'district' ? '/district'
      : portal === 'province_officer' || portal === 'super_admin' || portal === 'province' ? '/province'
      : null;
    navigate(base ? `${base}/complaints?ref=${c.referenceId}` : `/citizen/complaint/${c.id}`);
  };

  if (mapInitError) {
    return (
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-outline-variant bg-surface-container-lowest p-6 flex flex-col items-center justify-center gap-3 text-center shadow-sm select-none"
        style={{ height }}
      >
        <div className="w-12 h-12 rounded-2xl bg-error-container/40 text-error flex items-center justify-center">
          <Icon name="map" size={28} />
        </div>
        <div>
          <h4 className="font-headline-md text-sm font-bold text-on-surface">{pick('Map unavailable', 'नक्सा उपलब्ध छैन')}</h4>
          <p className="font-body-md text-xs text-on-surface-variant max-w-xs mt-1">
            {pick('The map could not load. Please refresh the page.', 'नक्सा लोड हुन सकेन। पृष्ठ फेरि खोल्नुहोस्।')}
          </p>
        </div>
      </div>
    );
  }

  const missingCoordsCount = complaints.length - validGeoComplaints.length;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-outline-variant shadow-sm select-none" style={{ height }}>
      {/* 1. Leaflet Real Geographic Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 2. Floating Filter Bar (View mode only) */}
      {mode === 'view' && showFilters && (
        <div className="absolute top-3 inset-x-3 z-[400] flex flex-col gap-1.5 pointer-events-none">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pointer-events-auto">
            <button
              type="button"
              aria-label="Filter all complaints"
              onClick={() => handleCategoryFilterClick('all')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all flex-shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-primary text-on-primary ring-2 ring-primary/30'
                  : 'bg-surface/95 backdrop-blur-md text-on-surface hover:bg-surface border border-outline-variant/60'
              }`}
            >
              <Icon name="filter_list" size={14} />
              {pick('All', 'सबै')} ({validGeoComplaints.length})
            </button>

            {missingCoordsCount > 0 && (
              <span
                title={`${missingCoordsCount} complaint(s) in the list have no coordinates and remain viewable in the complaints table.`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-surface/90 backdrop-blur-md text-on-surface-variant border border-outline-variant/50 flex-shrink-0"
              >
                <Icon name="info" size={13} className="text-amber-600" />
                {validGeoComplaints.length}/{complaints.length} {pick('on map', 'नक्सामा')}
              </span>
            )}

            {CATEGORY_KEYS.map(cat => {
              const count = validGeoComplaints.filter(c => c.category === cat).length;
              const isCatActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  aria-label={`Filter by ${cat}`}
                  onClick={() => handleCategoryFilterClick(cat)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all flex-shrink-0 ${
                    isCatActive
                      ? 'bg-primary text-on-primary ring-2 ring-primary/30'
                      : 'bg-surface/95 backdrop-blur-md text-on-surface hover:bg-surface border border-outline-variant/60'
                  }`}
                >
                  <Icon name={getCategoryIconName(cat)} size={14} />
                  {pick(CATEGORY_META[cat].label, CATEGORY_META[cat].labelNe)} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Status Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
            <button
              type="button"
              onClick={() => handleStatusFilterClick('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm transition-all flex-shrink-0 ${
                activeStatus === 'all'
                  ? 'bg-on-surface text-surface'
                  : 'bg-surface/90 backdrop-blur-md text-on-surface-variant hover:text-on-surface border border-outline-variant/50'
              }`}
            >
              {pick('All statuses', 'सबै स्थिति')}
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterClick('critical')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold shadow-sm transition-all flex-shrink-0 ${
                activeStatus === 'critical'
                  ? 'bg-red-600 text-white'
                  : 'bg-surface/90 backdrop-blur-md text-red-600 border border-red-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {pick('Urgent', 'जरुरी')} ({validGeoComplaints.filter(c => c.priority === 'critical' || c.status === 'escalated').length})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterClick('in_progress')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold shadow-sm transition-all flex-shrink-0 ${
                activeStatus === 'in_progress'
                  ? 'bg-amber-600 text-white'
                  : 'bg-surface/90 backdrop-blur-md text-amber-700 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {pick('In progress', 'काम हुँदै')} ({validGeoComplaints.filter(c => c.status === 'in_progress').length})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterClick('resolved')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold shadow-sm transition-all flex-shrink-0 ${
                activeStatus === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-surface/90 backdrop-blur-md text-emerald-700 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {pick('Resolved', 'समाधान')} ({validGeoComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length})
            </button>
          </div>
        </div>
      )}

      {/* 3. Map Controls (Zoom In, Zoom Out, Recenter) */}
      <div className="absolute top-24 right-3 z-[400] flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Zoom in map"
          title="Zoom in"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-9 h-9 rounded-xl bg-surface/95 backdrop-blur-md text-on-surface flex items-center justify-center shadow-md border border-outline-variant/60 hover:bg-surface active:scale-95 text-base font-bold transition-all"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out map"
          title="Zoom out"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-9 h-9 rounded-xl bg-surface/95 backdrop-blur-md text-on-surface flex items-center justify-center shadow-md border border-outline-variant/60 hover:bg-surface active:scale-95 text-base font-bold transition-all"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Recenter map"
          title="Recenter map"
          onClick={handleRecenter}
          className="w-9 h-9 rounded-xl bg-surface/95 backdrop-blur-md text-primary flex items-center justify-center shadow-md border border-outline-variant/60 hover:bg-surface active:scale-95 transition-all"
        >
          <Icon name="my_location" size={16} />
        </button>
      </div>

      {/* 4. Legend Box (View Mode) */}
      {mode === 'view' && showLegend && (
        <div className="absolute left-3 bottom-3 z-[400] bg-surface/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-outline-variant/60 text-xs flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span className="text-on-surface-variant font-medium">{pick('Urgent', 'जरुरी')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span className="text-on-surface-variant font-medium">{pick('In progress', 'काम हुँदै')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-on-surface-variant font-medium">{pick('Resolved', 'समाधान')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <span className="text-on-surface-variant font-medium">{pick('Pending', 'बाँकी')}</span>
          </div>
        </div>
      )}

      {/* 5. Coordinates Pill (Picker Mode) */}
      {mode === 'picker' && coordinates && (
        <div className="absolute bottom-3 inset-x-3 z-[400] flex items-center justify-between bg-surface/95 backdrop-blur-md rounded-xl px-3.5 py-2 text-xs text-on-surface shadow border border-outline-variant/50">
          <div className="flex items-center gap-1.5 truncate max-w-[70%]">
            <Icon name="pin_drop" size={16} className="text-primary flex-shrink-0" />
            <span className="font-mono font-semibold text-primary truncate">
              {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
            </span>
          </div>
          <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
            {pick('Tap map to move pin', 'पिन सार्न नक्सामा थिच्नुहोस्')}
          </span>
        </div>
      )}

      {/* 6. GPS Detecting Overlay */}
      {isDetecting && (
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-[500]">
          <Icon name="progress_activity" size={28} className="text-primary animate-spin" />
          <span className="text-sm font-bold text-primary">{pick('Finding your location…', 'तपाईंको स्थान खोज्दै…')}</span>
        </div>
      )}

      {/* 7. Bottom Selected Complaint Preview Card */}
      {activeComplaint && mode === 'view' && (
        <div className="absolute inset-x-3 bottom-3 z-[450] bg-surface rounded-2xl shadow-2xl border border-outline-variant p-4.5 animate-slide-up">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-primary">{activeComplaint.referenceId}</span>
              <StatusBadge status={activeComplaint.status} />
              <PriorityBadge priority={activeComplaint.priority} />
            </div>
            <button
              type="button"
              aria-label="Close complaint preview"
              onClick={() => setActiveComplaint(null)}
              className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <h4 className="text-base font-bold text-on-surface line-clamp-1 mb-1">
            {activeComplaint.title}
          </h4>
          <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-2 mb-3">
            {activeComplaint.description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-outline-variant/40 pt-2.5">
            <div className="flex flex-col gap-1 text-on-surface-variant">
              <div className="flex items-center gap-1">
                <Icon name="location_on" size={15} className="text-primary flex-shrink-0" />
                <span className="font-semibold text-on-surface text-xs sm:text-sm">
                  {activeComplaint.wardLabel ? `${activeComplaint.wardLabel}, ` : ''}{activeComplaint.jurisdictionName} ({activeComplaint.districtName})
                </span>
              </div>
              {activeComplaint.location?.lat && activeComplaint.location?.lng && (
                <span className="text-xs font-mono text-on-surface-variant/80 pl-4">
                  GPS: {Number(activeComplaint.location.lat).toFixed(5)}, {Number(activeComplaint.location.lng).toFixed(5)} • <span className="capitalize">{activeComplaint.category}</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleOpenDetails(activeComplaint)}
              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 flex items-center gap-1 transition-all shadow-sm"
            >
              Inspect Case <Icon name="arrow_forward" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryIconName(category: ComplaintCategory): string {
  switch (category) {
    case 'roads': return 'add_road';
    case 'water': return 'water_drop';
    case 'drainage': return 'plumbing';
    case 'sanitation': return 'delete';
    case 'electricity': return 'bolt';
    case 'parks': return 'park';
    case 'public_safety': return 'security';
    case 'disaster_mgmt': return 'emergency';
    default: return 'warning';
  }
}
