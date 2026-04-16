/**
 * RoutePanel.jsx
 *
 * Shows alternate route suggestions when a road is clicked on the map.
 *
 * Data sources (in priority order):
 *   1. OpenRouteService (ORS) API — real routes with real distance & duration
 *      Requires: VITE_ORS_API_KEY in .env
 *   2. Static fallback table (used when no ORS key or API fails)
 *
 * Also shows live incidents for the selected road from the backend.
 */

import { useState, useEffect } from 'react'
import { incidentsAPI } from '../api/trafficApi'

const ORS_KEY = import.meta.env.VITE_ORS_API_KEY?.trim()

// ── Road endpoint coordinates (for ORS API routing) ──────────────────────
// [lng, lat] format — ORS uses (longitude, latitude) order
const ROAD_ENDPOINTS = {
  'NH-48 — Heavy Traffic': {
    start: [77.0850, 28.5050],
    end:   [77.2090, 28.6080],
  },
  'Ring Road — Moderate Traffic': {
    start: [77.1580, 28.6480],
    end:   [77.2490, 28.5580],
  },
  'Mathura Road — Heavy Traffic': {
    start: [77.2350, 28.6200],
    end:   [77.2920, 28.5420],
  },
  'Rohtak Road — Moderate Traffic': {
    start: [77.2020, 28.6580],
    end:   [77.0830, 28.6760],
  },
  'Noida Expressway — Free Flow': {
    start: [77.3100, 28.6200],
    end:   [77.3660, 28.5500],
  },
  'Dwarka Expressway — Free Flow': {
    start: [77.0250, 28.6450],
    end:   [77.0920, 28.6090],
  },
  'Outer Ring Road — Free Flow': {
    start: [77.1400, 28.7100],
    end:   [77.2980, 28.6100],
  },
  'Connaught Place — Heavy Traffic': {
    start: [77.1970, 28.6340],  // approaching Connaught Place from west
    end:   [77.2290, 28.6300],  // exit toward east
  },
  'Chandni Chowk — Heavy Traffic': {
    start: [77.2140, 28.6560],
    end:   [77.2470, 28.6510],
  },
  'Lajpat Nagar — Moderate': {
    start: [77.2280, 28.5720],
    end:   [77.2670, 28.5690],
  },
}

// ── Static fallback routes (used if ORS key not configured or API fails) ──
const FALLBACK_ROUTES = {
  'NH-48 — Heavy Traffic': [
    { name: 'Dwarka Expressway',     status: 'Faster', color: '#4ade80' },
    { name: 'Palam Road via Gurgaon', status: 'Alternative', color: '#f4a261' },
  ],
  'Connaught Place — Heavy Traffic': [
    { name: 'Barakhamba Road',        status: 'Faster', color: '#4ade80' },
    { name: 'Kasturba Gandhi Marg',   status: 'Alternative', color: '#f4a261' },
  ],
  'Mathura Road — Heavy Traffic': [
    { name: 'Noida Expressway',       status: 'Faster', color: '#4ade80' },
    { name: 'Kalindi Kunj Road',      status: 'Alternative', color: '#f4a261' },
  ],
  'Chandni Chowk — Heavy Traffic': [
    { name: 'Ring Road via SP Mukherji', status: 'Faster', color: '#4ade80' },
    { name: 'Lothian Road',              status: 'Alternative', color: '#f4a261' },
  ],
  default: [
    { name: 'Outer Ring Road',        status: 'Faster', color: '#4ade80' },
    { name: 'Alternate Corridor B',   status: 'Alternative', color: '#f4a261' },
  ],
}

// ── ORS API call ──────────────────────────────────────────────────────────
async function fetchORSRoutes(start, end) {
  if (!ORS_KEY) return null

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': ORS_KEY,
      'Content-Type':  'application/json',
      'Accept':        'application/json, application/geo+json',
    },
    body: JSON.stringify({
      coordinates: [start, end],
      alternative_routes: {
        target_count:  2,   // request up to 2 alternatives
        weight_factor: 1.6, // allow 60% longer weight
        share_factor:  0.6, // routes may share up to 60% of path
      },
      instructions: false,
    }),
  })

  if (!res.ok) throw new Error(`ORS HTTP ${res.status}`)
  const json = await res.json()

  return (json.features || []).map((feature, i) => ({
    name:     i === 0 ? 'Primary Route' : `Alternate ${i}`,
    time:     `${Math.round(feature.properties.summary.duration / 60)} min`,
    distance: `${(feature.properties.summary.distance / 1000).toFixed(1)} km`,
    status:   i === 0 ? 'Fastest' : 'Alternate',
    color:    i === 0 ? '#4ade80' : '#f4a261',
    source:   'ors', // mark as real data
  }))
}

// ── Extract clean road name from the map key ────────────────────────────
function extractRoadName(road) {
  return road ? road.split(' — ')[0].trim() : ''
}

function trafficColor(level) {
  if (level === 'High')   return '#ef4444'
  if (level === 'Medium') return '#f59e0b'
  return '#4ade80'
}

// ── Main component ──────────────────────────────────────────────────────
export default function RoutePanel({ road, onClose }) {
  const [routes,    setRoutes]    = useState([])
  const [incidents, setIncidents] = useState([])
  const [orsLoading, setOrsLoading] = useState(false)
  const [orsError,   setOrsError]   = useState(null)
  const [incLoading, setIncLoading] = useState(false)
  const [dataSource, setDataSource] = useState(null) // 'ors' | 'static'

  useEffect(() => {
    if (!road) return

    // ── 1. Fetch live incidents for the clicked road ─────────────────
    const roadName = extractRoadName(road)
    setIncLoading(true)
    incidentsAPI.getAll({ location: roadName, isActive: 'true', limit: 5 })
      .then(res => { if (res.success) setIncidents(res.data || []) })
      .catch(() => setIncidents([]))
      .finally(() => setIncLoading(false))

    // ── 2. Fetch real ORS routes (or fall back to static) ────────────
    const endpoints = ROAD_ENDPOINTS[road]
    if (endpoints && ORS_KEY) {
      setOrsLoading(true)
      setOrsError(null)
      setRoutes([])
      fetchORSRoutes(endpoints.start, endpoints.end)
        .then(orsRoutes => {
          if (orsRoutes && orsRoutes.length > 0) {
            setRoutes(orsRoutes)
            setDataSource('ors')
          } else {
            throw new Error('No routes returned')
          }
        })
        .catch(err => {
          console.warn('ORS failed:', err.message, '→ using static fallback')
          setOrsError(err.message)
          setRoutes((FALLBACK_ROUTES[road] || FALLBACK_ROUTES.default).map(r => ({
            ...r, time: '—', distance: '—', source: 'static',
          })))
          setDataSource('static')
        })
        .finally(() => setOrsLoading(false))
    } else {
      // No ORS key — use static immediately
      setRoutes((FALLBACK_ROUTES[road] || FALLBACK_ROUTES.default).map(r => ({
        ...r, time: '—', distance: '—', source: 'static',
      })))
      setDataSource('static')
    }
  }, [road])

  if (!road) return null

  const roadName  = extractRoadName(road)
  const incCount  = incidents.length
  const isCongested = road.includes('Heavy') || road.includes('Moderate')

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '280px', right: 0,
      backgroundColor: '#0f0f1a',
      borderTop: '2px solid #e63946',
      padding: '18px 24px',
      zIndex: 5000,
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start',
      animation: 'slideUp 0.3s ease',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
    }}>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Left: Avoid zone ──────────────────────────────────────────── */}
      <div style={{ minWidth: '200px' }}>
        <div style={{ fontSize: '10px', color: '#e63946', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px' }}>
          ⚠️ AVOID
        </div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>
          {roadName}
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
          {isCongested
            ? `${incCount > 0 ? `${incCount} active incident(s) reported` : 'Congestion detected on this road'}`
            : 'Low congestion — road is clear'}
        </div>

        {/* Live incident pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {incLoading ? (
            <span style={{ fontSize: '10px', color: '#64748b' }}>Loading incidents...</span>
          ) : incidents.length > 0 ? (
            incidents.slice(0, 2).map((inc, i) => (
              <div key={i} style={{
                fontSize: '10px', fontWeight: '600', borderRadius: '10px',
                padding: '2px 8px',
                backgroundColor: inc.trafficLevel === 'High' ? '#1a0a0e' : '#1a1500',
                color: inc.trafficLevel === 'High' ? '#ef4444' : '#f59e0b',
                border: `1px solid ${inc.trafficLevel === 'High' ? '#ef444444' : '#f59e0b44'}`,
              }}>
                {inc.type}
              </div>
            ))
          ) : (
            <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '600' }}>
              ✅ No user-reported incidents
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div style={{ width: '1px', backgroundColor: '#2a2a3e', alignSelf: 'stretch' }} />

      {/* ── Routes ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: '700', letterSpacing: '0.5px' }}>
            🗺️ ALTERNATE ROUTES
          </div>
          {/* Data source label */}
          <div style={{
            fontSize: '9px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px',
            backgroundColor: dataSource === 'ors' ? '#0ea5e920' : '#2a2a3e',
            color: dataSource === 'ors' ? '#38bdf8' : '#64748b',
            border: `1px solid ${dataSource === 'ors' ? '#0ea5e844' : '#3a3a4e'}`,
          }}>
            {dataSource === 'ors' ? '🛰 OpenRouteService' : dataSource === 'static' ? '📋 Static Reference' : '—'}
          </div>
        </div>

        {/* ORS not configured notice */}
        {!ORS_KEY && (
          <div style={{
            fontSize: '10px', color: '#64748b',
            backgroundColor: '#16213e', borderRadius: '8px',
            padding: '6px 10px', marginBottom: '8px',
            border: '1px solid #2a2a3e',
          }}>
            💡 Add <code style={{ color: '#38bdf8' }}>VITE_ORS_API_KEY</code> to .env for real route distances and times
          </div>
        )}

        {/* Loading spinner */}
        {orsLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px', padding: '8px 0' }}>
            <div style={{ width: '14px', height: '14px', border: '2px solid #4ade8066', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Fetching routes from OpenRouteService...
          </div>
        )}

        {/* Route cards */}
        {!orsLoading && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {routes.map((route, i) => (
              <div key={i} style={{
                flex: 1,
                backgroundColor: '#16213e',
                border: `1px solid ${route.color}33`,
                borderRadius: '10px',
                padding: '12px 14px',
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a2a4e'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16213e'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                    {i === 0 ? '🥇' : '🥈'} {route.name}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', color: route.color,
                    backgroundColor: `${route.color}22`, padding: '2px 8px', borderRadius: '10px',
                  }}>
                    {route.status}
                  </span>
                </div>

                {/* Time & distance (real from ORS, or — if static) */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: route.color }}>{route.time}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>travel time</div>
                  </div>
                  {route.distance !== '—' && (
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>{route.distance}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>distance</div>
                    </div>
                  )}
                </div>

                {route.source === 'static' && (
                  <div style={{ fontSize: '9px', color: '#475569', marginTop: '4px' }}>
                    ⚠️ Estimated — add ORS key for real data
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ORS error note */}
        {orsError && (
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
            ⚠️ ORS unavailable ({orsError}) — showing reference routes
          </div>
        )}
      </div>

      {/* ── Live incidents from backend (right column) ────────────────── */}
      {!incLoading && incidents.length > 0 && (
        <>
          <div style={{ width: '1px', backgroundColor: '#2a2a3e', alignSelf: 'stretch' }} />
          <div style={{ width: '180px' }}>
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '8px' }}>
              📋 REPORTED INCIDENTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {incidents.slice(0, 3).map((inc, i) => (
                <div key={i} style={{
                  backgroundColor: '#16213e', border: '1px solid #2a2a3e',
                  borderRadius: '8px', padding: '7px 10px', fontSize: '11px',
                }}>
                  <div style={{ color: 'white', fontWeight: '600', marginBottom: '2px' }}>{inc.type}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                    <span style={{ color: trafficColor(inc.trafficLevel) }}>{inc.trafficLevel}</span>
                    <span>{inc.source || 'Reported'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Close button ─────────────────────────────────────────────── */}
      <div onClick={onClose} style={{
        cursor: 'pointer', color: '#64748b', fontSize: '20px',
        padding: '4px', marginTop: '-4px', transition: 'color 0.15s',
      }}
        onMouseEnter={e => e.target.style.color = 'white'}
        onMouseLeave={e => e.target.style.color = '#64748b'}
      >
        ✕
      </div>
    </div>
  )
}