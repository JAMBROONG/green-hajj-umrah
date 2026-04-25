'use client';

import { useEffect, useRef, useState } from 'react';
import { searchLocations, Location } from '@/lib/locationService';
import { IoSearch, IoClose, IoLocationSharp, IoCheckmarkCircle } from 'react-icons/io5';

/**
 * RouteLocationPicker — single card UI untuk pencarian rute (origin → destination)
 * pakai OpenStreetMap Nominatim. Pattern visual mengikuti Gojek/Grab:
 *   ●━━━ Origin (hijau)
 *   ⇅    Swap button
 *   ◼   Destination (merah)
 *
 * Fitur UX:
 * - Search icon prefix pada input
 * - Clear button (x) saat ada teks/selected
 * - Suggestions ter-format: judul tebal (kota/landmark) + alamat lengkap di subtitle
 * - Loading spinner halus (bukan emoji ⏳)
 * - Empty state: "Cari lokasi (min. 3 karakter)"
 * - Selected state: pill hijau dengan nama lokasi + tombol clear
 * - Swap button di antara origin & destination untuk membalik rute
 */
export interface RouteLocationPickerProps {
  origin: Location | null;
  destination: Location | null;
  onOriginChange: (location: Location | null) => void;
  onDestinationChange: (location: Location | null) => void;
  /** Optional override label */
  originLabel?: string;
  destinationLabel?: string;
  originPlaceholder?: string;
  destinationPlaceholder?: string;
}

export default function RouteLocationPicker({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  originLabel = 'Dari (Lokasi Asal)',
  destinationLabel = 'Menuju (Lokasi Tujuan)',
  originPlaceholder = 'Cari lokasi asal…',
  destinationPlaceholder = 'Cari lokasi tujuan…',
}: RouteLocationPickerProps) {
  // Snapshot stale-closure protection — capture nilai SAAT klik, bukan
  // mengandalkan state yang bisa berubah karena race condition.
  const handleSwap = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const prevOrigin = origin;
    const prevDestination = destination;
    onOriginChange(prevDestination);
    onDestinationChange(prevOrigin);
  };

  const canSwap = !!(origin && destination);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Rute Perjalanan
        </p>
        {/* Tombol Tukar di header — selalu kelihatan saat keduanya selected,
            tidak overlap dengan pill input apapun. */}
        {canSwap && (
          <button
            type="button"
            onClick={handleSwap}
            aria-label="Tukar lokasi asal & tujuan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primaryLight text-primary text-xs font-semibold border border-primary/20 hover:bg-primary hover:text-white transition active:scale-95"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4v16M7 4l-3 3M7 4l3 3" />
              <path d="M17 20V4M17 20l-3-3M17 20l3-3" />
            </svg>
            Tukar
          </button>
        )}
      </div>

      {/* Origin */}
      <LocationSearchField
        label={originLabel}
        placeholder={originPlaceholder}
        selected={origin}
        onSelect={onOriginChange}
        markerColor="emerald"
      />

      {/* Vertical connector line antara origin & destination */}
      <div className="ml-[6px] h-3 border-l-2 border-dashed border-gray-300" aria-hidden="true" />

      {/* Destination */}
      <LocationSearchField
        label={destinationLabel}
        placeholder={destinationPlaceholder}
        selected={destination}
        onSelect={onDestinationChange}
        markerColor="rose"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-component: single search field
// ────────────────────────────────────────────────────────────────────────────

interface LocationSearchFieldProps {
  label: string;
  placeholder: string;
  selected: Location | null;
  onSelect: (location: Location | null) => void;
  markerColor: 'emerald' | 'rose';
}

function LocationSearchField({
  label,
  placeholder,
  selected,
  onSelect,
  markerColor,
}: LocationSearchFieldProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const markerClasses =
    markerColor === 'emerald'
      ? { bg: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' }
      : { bg: 'bg-rose-500',    ring: 'ring-rose-200',    text: 'text-rose-700',    light: 'bg-rose-50',    border: 'border-rose-200' };

  // Debounced search
  useEffect(() => {
    if (selected) return; // jangan search kalau sudah ada selection
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        setSuggestions(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  // Click outside to close suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setSuggestions([]);
  };

  // Split Nominatim displayName: "Name, Subdistrict, City, State, Country"
  // Ambil 1 segmen pertama sebagai title, sisanya sebagai subtitle.
  const splitDisplayName = (displayName: string) => {
    const parts = displayName.split(',').map((s) => s.trim());
    return {
      title: parts[0] || displayName,
      subtitle: parts.slice(1).join(', ') || '',
    };
  };

  // SELECTED STATE — tampilkan pill hijau/merah yang clean
  if (selected) {
    const { title, subtitle } = splitDisplayName(selected.displayName);
    return (
      <div ref={containerRef} className="flex items-start gap-3">
        <div className={`mt-3 w-3 h-3 rounded-full ${markerClasses.bg} ring-4 ${markerClasses.ring} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {label}
          </label>
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 ${markerClasses.border} ${markerClasses.light}`}>
            <IoCheckmarkCircle className={`text-lg flex-shrink-0 ${markerClasses.text}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${markerClasses.text}`}>{title}</p>
              {subtitle && (
                <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              aria-label="Hapus pilihan"
              className="flex-shrink-0 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 flex items-center justify-center transition"
            >
              <IoClose className="text-sm" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY/SEARCHING STATE — input + suggestions dropdown
  return (
    <div ref={containerRef} className="flex items-start gap-3">
      <div className={`mt-3 w-3 h-3 rounded-full ${markerClasses.bg} ring-4 ${markerClasses.ring} flex-shrink-0`} />
      <div className="flex-1 min-w-0 relative">
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          {label}
        </label>

        {/* Input dengan search icon + clear button */}
        <div className="relative">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:outline-none transition"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              aria-label="Bersihkan pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition"
            >
              <IoClose className="text-xs" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {isFocused && (
          <div className="absolute z-20 left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Min-character hint */}
            {query.length > 0 && query.length < 3 && !isSearching && (
              <div className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                <IoSearch className="text-sm" />
                Ketik min. 3 karakter untuk mencari…
              </div>
            )}

            {/* Loading */}
            {isSearching && (
              <div className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                Mencari lokasi…
              </div>
            )}

            {/* Empty result */}
            {!isSearching && query.length >= 3 && suggestions.length === 0 && (
              <div className="px-4 py-4 text-xs text-gray-500 text-center">
                Tidak ada lokasi cocok untuk &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Results */}
            {!isSearching && suggestions.length > 0 && (
              <div className="max-h-72 overflow-y-auto">
                {suggestions.map((loc) => {
                  const { title, subtitle } = splitDisplayName(loc.displayName);
                  return (
                    <button
                      key={loc.placeId}
                      type="button"
                      onClick={() => {
                        onSelect(loc);
                        setQuery('');
                        setSuggestions([]);
                        setIsFocused(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition flex items-start gap-2.5"
                    >
                      <IoLocationSharp className={`text-lg mt-0.5 flex-shrink-0 ${markerClasses.text}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {title}
                        </p>
                        {subtitle && (
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
