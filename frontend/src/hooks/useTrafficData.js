/**
 * useTrafficData — Shared React Hook
 *
 * Data source priority:
 *   1. TomTom Traffic Incidents API v5 (real-world incidents)
 *   2. Backend /api/alerts (user-reported incidents as fallback)
 *
 * Refreshes every 90 seconds automatically.
 */

import { useState, useEffect, useCallback } from 'react'

const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY?.trim()

// Bounding box covering all major Delhi roads tracked on the map
// Format: minLon, minLat, maxLon, maxLat  (area ~1,870 km² — within TomTom's 10,000 km² limit)
const DELHI_BBOX = '76.85,28.40,77.42,28.74'

/**
 * TomTom iconCategory → display metadata
 * iconCategory reference:
 *   1=Accident, 2=Fog, 3=Hazard, 4=Rain, 5=Ice, 6=Jam
 *   7=LaneClosed, 8=RoadClosed, 9=RoadWorks, 10=Wind, 11=Flooding, 14=Breakdown
 */
const CATEGORY_INFO = {
  1:  { label: 'Accident',     icon: '⚠️',  color: '#ef4444', incType: 'accident' },
  2:  { label: 'Fog',          icon: '🌫️',  color: '#94a3b8', incType: 'hazard'  },
  3:  { label: 'Hazard',       icon: '⚡',   color: '#f59e0b', incType: 'hazard'  },
  4:  { label: 'Rain',         icon: '🌧️',  color: '#3b82f6', incType: 'hazard'  },
  5:  { label: 'Ice',          icon: '🧊',   color: '#60a5fa', incType: 'hazard'  },
  6:  { label: 'Traffic Jam',  icon: '🚗',   color: '#f97316', incType: 'jam'     },
  7:  { label: 'Lane Closed',  icon: '🚧',   color: '#f59e0b', incType: 'closure' },
  8:  { label: 'Road Closed',  icon: '🚫',   color: '#dc2626', incType: 'closure' },
  9:  { label: 'Road Works',   icon: '👷',   color: '#8b5cf6', incType: 'closure' },
  10: { label: 'Wind',         icon: '💨',   color: '#64748b', incType: 'hazard'  },
  11: { label: 'Flooding',     icon: '🌊',   color: '#0ea5e9', incType: 'hazard'  },
  14: { label: 'Breakdown',    icon: '🔧',   color: '#78716c', incType: 'hazard'  },
}

/**
 * magnitudeOfDelay → human-readable severity
 *   0=Unknown, 1=Minor (<10min), 2=Moderate (10-30min), 3=Major (30-90min)
 */
function severityLabel(mag) {
  return ['Unknown', 'Minor', 'Moderate', 'Major'][mag] || 'Unknown'
}

/** Parse raw TomTom GeoJSON incident features into normalized objects */
function parseTomTomIncidents(raw) {
  return (raw || []).map((inc) => {
    const p = inc.properties || {}
    const info = CATEGORY_INFO[p.iconCategory] || {
      label: 'Incident', icon: '📍', color: '#64748b', incType: 'other',
    }
    return {
      id:           p.originalId || p.id || String(Math.random()),
      category:     p.iconCategory,            // TomTom numeric code
      incType:      info.incType,              // 'accident' | 'jam' | 'closure' | 'hazard' | 'other'
      label:        info.label,               // Display label
      icon:         info.icon,
      color:        info.color,
      severity:     p.magnitudeOfDelay ?? 0,
      severityLabel: severityLabel(p.magnitudeOfDelay ?? 0),
      from:         p.from || '',
      to:           p.to || '',
      delay:        p.delay || 0,              // extra time in seconds
      length:       p.length || 0,            // affected stretch in meters
      description:  p.events?.[0]?.description || info.label,
      road:         (p.roadNumbers || [])[0] || '',
    }
  })
}

/** Convert backend alert objects into the same normalized shape */
function parseBackendAlerts(alerts) {
  return (alerts || []).map((a) => {
    const catNum = a.type === 'Accident' ? 1 : a.type.toLowerCase().includes('jam') ? 6 : 8
    const info   = CATEGORY_INFO[catNum] || CATEGORY_INFO[8]
    return {
      id:           a._id,
      category:     catNum,
      incType:      info.incType,
      label:        a.type,
      icon:         info.icon,
      color:        info.color,
      severity:     a.trafficLevel === 'High' ? 3 : a.trafficLevel === 'Medium' ? 2 : 1,
      severityLabel: a.trafficLevel === 'High' ? 'Major' : a.trafficLevel === 'Medium' ? 'Moderate' : 'Minor',
      from:         a.location,
      to:           '',
      delay:        0,
      length:       0,
      description:  a.description || a.type,
      road:         a.location,
    }
  })
}

export function useTrafficData() {
  const [incidents,    setIncidents]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [source,       setSource]       = useState(null)   // 'tomtom' | 'backend' | null
  const [lastUpdated,  setLastUpdated]  = useState(null)

  const fetchData = useCallback(async () => {

    // ── 1. Try TomTom Incidents API v5 ─────────────────────────────────────
    if (TOMTOM_KEY) {
      try {
        const fields = encodeURIComponent(
          '{incidents{type,geometry,properties{id,originalId,iconCategory,magnitudeOfDelay,' +
          'events{description,code,iconCategory},from,to,length,delay,roadNumbers,timeValidity}}}'
        )
        const url =
          `https://api.tomtom.com/traffic/services/5/incidentDetails` +
          `?key=${TOMTOM_KEY}&bbox=${DELHI_BBOX}` +
          `&fields=${fields}&language=en-GB` +
          `&categoryFilter=1,6,7,8,9&timeValidityFilter=present`

        const res = await fetch(url)
        if (!res.ok) throw new Error(`TomTom HTTP ${res.status}`)

        const json = await res.json()
        const parsed = parseTomTomIncidents(json.incidents)
        setIncidents(parsed)
        setSource('tomtom')
        setLastUpdated(new Date())
        setError(null)
        setLoading(false)
        return
      } catch (err) {
        console.warn('[useTrafficData] TomTom failed:', err.message, '→ using backend fallback')
      }
    }

    // ── 2. Backend /api/alerts fallback ────────────────────────────────────
    try {
      const res  = await fetch('/api/alerts')
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'API error')

      setIncidents(parseBackendAlerts(json.data))
      setSource('backend')
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('[useTrafficData] Backend fallback failed:', err.message)
      setError('Live traffic data unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 90_000) // auto-refresh every 90 s
    return () => clearInterval(timer)
  }, [fetchData])

  // ── Derived counters ────────────────────────────────────────────────────
  const jams     = incidents.filter(i => i.incType === 'jam')
  const accidents = incidents.filter(i => i.incType === 'accident')
  const closures  = incidents.filter(i => i.incType === 'closure')
  const hazards   = incidents.filter(i => i.incType === 'hazard')

  const avgDelayMin =
    incidents.length > 0
      ? Math.round(incidents.reduce((s, i) => s + i.delay, 0) / incidents.length / 60)
      : 0

  return {
    incidents,
    jams,
    accidents,
    closures,
    hazards,
    avgDelayMin,
    loading,
    error,
    source,
    lastUpdated,
    refresh: fetchData,
  }
}
