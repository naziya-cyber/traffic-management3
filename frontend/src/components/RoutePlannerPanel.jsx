/**
 * RoutePlannerPanel.jsx
 *
 * A floating route planner on the map view.
 * Users select origin + destination from Delhi locations.
 * Fetches real routes from OpenRouteService (ORS) via the backend proxy.
 * The ORS key lives securely in backend/.env (ORS_API_KEY).
 */

import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ── Delhi locations with GPS coordinates [lng, lat] ──────────────────────
// These match the roads on the map + common commute points
const LOCATIONS = {
  'Connaught Place':     [77.2194, 28.6330],
  'India Gate':          [77.2295, 28.6129],
  'Chandni Chowk':       [77.2310, 28.6562],
  'Rohini':              [77.0900, 28.7317],
  'Pitampura':           [77.1312, 28.7034],
  'Janakpuri':           [77.0828, 28.6290],
  'Dwarka':              [77.0590, 28.5921],
  'Dwarka Expressway':   [77.0250, 28.6450],
  'Rajouri Garden':      [77.1232, 28.6478],
  'Lajpat Nagar':        [77.2431, 28.5673],
  'Saket / Malviya Nagar': [77.2167, 28.5245],
  'Vasant Kunj':         [77.1579, 28.5261],
  'Mathura Road / Faridabad': [77.2920, 28.5420],
  'Noida Sector 18':     [77.3550, 28.5685],
  'Noida Expressway':    [77.3100, 28.6200],
  'NH-48 / Gurgaon':    [77.0850, 28.5050],
  'Jamia Nagar':         [77.3000, 28.5600],
  'Outer Ring Road':     [77.2980, 28.6100],
}

const LOCATION_NAMES = Object.keys(LOCATIONS)

// ── Fetch routes via backend proxy ─────────────────────────────────────
async function getRoutes(fromCoords, toCoords) {
  const res = await fetch(`${BACKEND_URL}/api/ors/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start: fromCoords, end: toCoords }),
  })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.message || `Server ${res.status}`)

  return (json.data.features || []).map((f, i) => {
    const { duration, distance } = f.properties.summary
    const mins = Math.round(duration / 60)
    const km   = (distance / 1000).toFixed(1)
    return {
      index:    i,
      label:    i === 0 ? '🥇 Fastest Route' : i === 1 ? '🥈 Alternate Route 1' : '🥉 Alternate Route 2',
      time:     mins,
      timeLabel: mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60}m`,
      distance: km,
      color:    i === 0 ? '#22c55e' : i === 1 ? '#f59e0b' : '#94a3b8',
      bg:       i === 0 ? '#f0fdf4' : i === 1 ? '#fffbeb' : '#f8fafc',
      border:   i === 0 ? '#bbf7d0' : i === 1 ? '#fde68a' : '#e2e8f0',
      badge:    i === 0 ? 'Fastest' : i === 1 ? 'Alternate' : 'Scenic',
    }
  })
}

// ── Component ───────────────────────────────────────────────────────────
export default function RoutePlannerPanel({ onClose }) {
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')
  const [routes,  setRoutes]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [done,    setDone]    = useState(false)

  async function handleFindRoute() {
    if (!from || !to)             { setError('Please select both From and To locations.'); return }
    if (from === to)              { setError('From and To cannot be the same.'); return }

    setLoading(true)
    setError(null)
    setRoutes([])
    setDone(false)

    try {
      const result = await getRoutes(LOCATIONS[from], LOCATIONS[to])
      setRoutes(result)
      setDone(true)
    } catch (err) {
      setError(`Could not fetch routes: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const selectStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#0f172a',
    backgroundColor: 'white',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '30px',
  }

  return (
    <div style={{
      position: 'absolute',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      width: '480px',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      animation: 'fadeDown 0.2s ease',
    }}>
      <style>{`
        @keyframes fadeDown { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes spin2 { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>🗺️ Find Best Route</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Real-time routes via OpenRouteService
          </div>
        </div>
        <div onClick={onClose} style={{ color: '#64748b', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}
          onMouseEnter={e => e.target.style.color = 'white'}
          onMouseLeave={e => e.target.style.color = '#64748b'}
        >✕</div>
      </div>

      {/* Form */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>

          {/* FROM / TO column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.4px', display: 'block', marginBottom: '4px' }}>
                📍 FROM
              </label>
              <select value={from} onChange={e => { setFrom(e.target.value); setDone(false) }} style={selectStyle}>
                <option value="">Select starting point...</option>
                {LOCATION_NAMES.filter(n => n !== to).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Swap button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }} />
              <div
                onClick={() => { const t = from; setFrom(to); setTo(t); setDone(false) }}
                title="Swap"
                style={{
                  cursor: 'pointer', fontSize: '14px', color: '#64748b',
                  padding: '2px 6px', borderRadius: '6px', backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >⇅</div>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }} />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.4px', display: 'block', marginBottom: '4px' }}>
                🏁 TO
              </label>
              <select value={to} onChange={e => { setTo(e.target.value); setDone(false) }} style={selectStyle}>
                <option value="">Select destination...</option>
                {LOCATION_NAMES.filter(n => n !== from).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Find button */}
          <div
            onClick={handleFindRoute}
            style={{
              backgroundColor: loading ? '#94a3b8' : '#0f172a',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              minWidth: '80px',
              transition: 'background 0.2s',
              alignSelf: 'center',
              marginTop: '8px',
            }}
          >
            {loading
              ? <div style={{ width: '18px', height: '18px', border: '2px solid #ffffff44', borderTopColor: 'white', borderRadius: '50%', animation: 'spin2 0.7s linear infinite' }} />
              : <>{done ? '✅' : '🔍'}<span style={{ fontSize: '11px' }}>{done ? 'Done' : 'Find'}</span></>
            }
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 12px',
            backgroundColor: '#fef2f2', borderRadius: '8px',
            border: '1px solid #fecaca', fontSize: '12px', color: '#dc2626',
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Route results */}
      {routes.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0 18px 16px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.4px', padding: '12px 0 8px' }}>
            ROUTE COMPARISON — {from} → {to}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {routes.map(route => (
              <div key={route.index} style={{
                backgroundColor: route.bg,
                border: `1px solid ${route.border}`,
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'transform 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                    {route.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    🛰 Via OpenRouteService (driving)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: route.color }}>
                    {route.timeLabel}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{route.distance} km</div>
                  <div style={{
                    display: 'inline-block', marginTop: '4px',
                    fontSize: '9px', fontWeight: '700',
                    color: route.color, backgroundColor: `${route.color}22`,
                    padding: '1px 8px', borderRadius: '10px',
                    border: `1px solid ${route.border}`,
                  }}>
                    {route.badge}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
            🛰 Real routes from OpenRouteService · Driving profile · Delhi road network
          </div>
        </div>
      )}
    </div>
  )
}
