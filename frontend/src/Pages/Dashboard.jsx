/**
 * Dashboard.jsx — Smart Traffic Authority View
 *
 * CHANGES FROM PREVIOUS VERSION:
 *  ✅ Emergency Corridor section removed
 *  ✅ Fake AI banner (96.8% accuracy) removed
 *  ✅ Fake aiRecommendations static data removed
 *  ✅ New: Real Metrics Bar from live incidents
 *  ✅ New: generateRecommendations() — rule-based, explainable logic
 *  ✅ New: useTrafficData hook for real TomTom incidents
 */

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { incidentsAPI, trafficAPI } from '../api/trafficApi'
import { useTrafficData } from '../hooks/useTrafficData'

// ── Static fallback data (used only when backend is unreachable) ─────────────
const staticPeakData = [
  { hour: '6am', level: 35 }, { hour: '7am', level: 55 },
  { hour: '8am', level: 90 }, { hour: '9am', level: 95 },
  { hour: '10am', level: 70 }, { hour: '11am', level: 50 },
  { hour: '12pm', level: 45 }, { hour: '1pm', level: 40 },
  { hour: '2pm', level: 38 }, { hour: '3pm', level: 42 },
  { hour: '4pm', level: 60 }, { hour: '5pm', level: 88 },
  { hour: '6pm', level: 95 }, { hour: '7pm', level: 85 },
  { hour: '8pm', level: 65 }, { hour: '9pm', level: 40 },
]

const staticRoads = [
  { name: 'NH-48 Highway',       status: 'Heavy',    level: 88, signal: 'Increase green by 45s', incidents: 2, color: '#ef4444', bg: '#fef2f2' },
  { name: 'Connaught Place',     status: 'Heavy',    level: 82, signal: 'Increase green by 40s', incidents: 1, color: '#ef4444', bg: '#fef2f2' },
  { name: 'Mathura Road',        status: 'Heavy',    level: 79, signal: 'Increase green by 35s', incidents: 3, color: '#ef4444', bg: '#fef2f2' },
  { name: 'Chandni Chowk',       status: 'Heavy',    level: 75, signal: 'Increase green by 30s', incidents: 1, color: '#ef4444', bg: '#fef2f2' },
  { name: 'Ring Road',           status: 'Moderate', level: 55, signal: 'Increase green by 15s', incidents: 0, color: '#f59e0b', bg: '#fffbeb' },
  { name: 'Rohtak Road',         status: 'Moderate', level: 50, signal: 'Increase green by 10s', incidents: 0, color: '#f59e0b', bg: '#fffbeb' },
  { name: 'Lajpat Nagar',        status: 'Moderate', level: 48, signal: 'Keep current timing',   incidents: 1, color: '#f59e0b', bg: '#fffbeb' },
  { name: 'Outer Ring Road',     status: 'Free',     level: 22, signal: 'Reduce green by 10s',   incidents: 0, color: '#10b981', bg: '#f0fdf4' },
  { name: 'Dwarka Expressway',   status: 'Free',     level: 18, signal: 'Reduce green by 15s',   incidents: 0, color: '#10b981', bg: '#f0fdf4' },
  { name: 'Noida Expressway',    status: 'Free',     level: 15, signal: 'Reduce green by 20s',   incidents: 0, color: '#10b981', bg: '#f0fdf4' },
  { name: 'India Gate Road',     status: 'Free',     level: 12, signal: 'Reduce green by 20s',   incidents: 0, color: '#10b981', bg: '#f0fdf4' },
]

// ── Transform backend incidents → road format ───────────────────────────────
function transformIncidentsToRoads(incidents) {
  const map = {}
  incidents.forEach(inc => {
    if (!map[inc.location]) map[inc.location] = { count: 0, highCount: 0 }
    map[inc.location].count++
    if (inc.trafficLevel === 'High') map[inc.location].highCount++
  })
  return Object.entries(map).map(([name, d]) => {
    const level  = Math.min(100, d.count * 10 + d.highCount * 15)
    const status = level >= 70 ? 'Heavy' : level >= 40 ? 'Moderate' : 'Free'
    const color  = level >= 70 ? '#ef4444' : level >= 40 ? '#f59e0b' : '#10b981'
    const bg     = level >= 70 ? '#fef2f2' : level >= 40 ? '#fffbeb' : '#f0fdf4'
    const signal = level >= 70 ? 'Increase green by 30–45s' : level >= 40 ? 'Increase green by 10–15s' : 'Reduce green by 10–20s'
    return { name, status, level, signal, incidents: d.count, color, bg }
  })
}

// ── Rule-based recommendation engine ───────────────────────────────────────
/**
 * generateRecommendations(incidents, roads)
 *
 * All recommendations are generated from real data. Each card shows:
 *  - The rule that triggered it (transparent & explainable in viva)
 *  - What action to take
 *  - How many roads/incidents triggered it
 *
 * Rules:
 *  1. Multiple high-congestion roads → signal timing adjustment
 *  2. Any active accidents → emergency response
 *  3. Many jams → alternate route signage
 *  4. High avg delay → peak-hour management
 *  If none → "Network Normal" (all clear)
 */
function generateRecommendations(incidents, roads) {
  const recs = []

  const heavyRoads = roads.filter(r => r.level >= 70)
  const accidents  = incidents.filter(i => i.incType === 'accident')
  const jams       = incidents.filter(i => i.incType === 'jam')
  const avgDelay   = incidents.length > 0
    ? Math.round(incidents.reduce((s, i) => s + i.delay, 0) / incidents.length / 60)
    : 0

  // Rule 1: High congestion → signal optimization
  if (heavyRoads.length >= 1) {
    const names = heavyRoads.slice(0, 2).map(r => r.name).join(', ')
    recs.push({
      icon:   '🚦',
      title:  'Signal Timing Adjustment',
      desc:   `${heavyRoads.length} road(s) above 70% congestion (${names}). Increasing green signal duration by 20–30 seconds is recommended to ease flow.`,
      rule:   `congestion_level ≥ 70% on ${heavyRoads.length} road(s)`,
      metric: `${heavyRoads.length} roads affected`,
      color:  '#ef4444',
      bg:     '#fef2f2',
      border: '#fecaca',
    })
  }

  // Rule 2: Active accidents → emergency response
  if (accidents.length > 0) {
    const loc = accidents[0].from || accidents[0].road || 'unknown location'
    recs.push({
      icon:   '🚨',
      title:  'Accident Alert — Response Required',
      desc:   `${accidents.length} accident(s) currently active (e.g. ${loc}). Deploy emergency vehicles, activate incident signs, and redirect nearby traffic.`,
      rule:   `accident_count > 0`,
      metric: `${accidents.length} active accident(s)`,
      color:  '#dc2626',
      bg:     '#fef2f2',
      border: '#fca5a5',
    })
  }

  // Rule 3: Many jams → alternate route signage
  if (jams.length > 2) {
    recs.push({
      icon:   '🗺️',
      title:  'Activate Alternate Route Signage',
      desc:   `${jams.length} traffic jams detected across the network. Variable message signs should display alternate corridor guidance to distribute load.`,
      rule:   `jam_count > 2`,
      metric: `${jams.length} jams active`,
      color:  '#f59e0b',
      bg:     '#fffbeb',
      border: '#fde68a',
    })
  }

  // Rule 4: High avg delay → peak-hour management
  if (avgDelay > 15 && recs.length < 3) {
    recs.push({
      icon:   '⏱',
      title:  'Peak Hour Management',
      desc:   `Average incident delay is ${avgDelay} minutes — above the 15-minute threshold. Consider activating peak-hour signal plans and dynamic lane control.`,
      rule:   `avg_delay > 15 min`,
      metric: `Avg delay: ${avgDelay} min`,
      color:  '#8b5cf6',
      bg:     '#f5f3ff',
      border: '#ddd6fe',
    })
  }

  // If nothing triggered — network normal
  if (recs.length === 0) {
    recs.push({
      icon:   '✅',
      title:  'Traffic Network — Normal',
      desc:   'All monitored corridors are operating within normal parameters. No threshold has been exceeded. Standard signal timing is sufficient.',
      rule:   'no threshold exceeded',
      metric: 'All clear',
      color:  '#10b981',
      bg:     '#f0fdf4',
      border: '#bbf7d0',
    })
  }

  return recs.slice(0, 3)
}

// ── Bar chart color ─────────────────────────────────────────────────────────
const getBarColor = level => level >= 75 ? '#ef4444' : level >= 50 ? '#f59e0b' : '#10b981'

// ── UI sub-components ───────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      backgroundColor: 'white', border: '1px solid #e2e8f0',
      borderRadius: '12px', padding: '16px 20px', flex: 1,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{label}</div>
        <span style={{ fontSize: '18px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color }}>{value ?? '—'}</div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>
    </div>
  )
}

function LiveMetricsBar({ incidents, roads, avgDelayMin }) {
  const heavy  = roads.filter(r => r.level >= 70).length
  const clear  = roads.filter(r => r.level < 40).length
  const total  = incidents.length
  const maxDel = incidents.length > 0 ? Math.max(...incidents.map(i => Math.round(i.delay / 60))) : 0

  const tiles = [
    { label: 'Active Incidents',   value: total,              icon: '⚠️',  color: total > 5  ? '#ef4444' : '#f59e0b' },
    { label: 'Avg Delay',          value: `${avgDelayMin} min`, icon: '⏱',  color: avgDelayMin > 15 ? '#ef4444' : '#f59e0b' },
    { label: 'Congested Roads',    value: heavy,              icon: '🔴',  color: heavy > 3  ? '#ef4444' : '#f59e0b' },
    { label: 'Clear Roads',        value: clear,              icon: '✅',  color: '#10b981' },
    { label: 'Worst Delay',        value: maxDel > 0 ? `${maxDel} min` : '—', icon: '🚗', color: maxDel > 30 ? '#ef4444' : '#94a3b8' },
  ]

  return (
    <div style={{
      display: 'flex', gap: '0',
      backgroundColor: '#0f172a',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '20px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      {tiles.map((t, i) => (
        <div key={i} style={{
          flex: 1, padding: '14px 12px', textAlign: 'center',
          borderRight: i < tiles.length - 1 ? '1px solid #1e293b' : 'none',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.icon}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: t.color, fontVariantNumeric: 'tabular-nums' }}>
            {t.value}
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600', letterSpacing: '0.4px', marginTop: '2px' }}>
            {t.label.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  )
}

function RecommendationCard({ rec }) {
  return (
    <div style={{
      flex: 1,
      backgroundColor: rec.bg,
      border: `1px solid ${rec.border}`,
      borderRadius: '12px',
      padding: '16px',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{rec.icon}</span>
          <div style={{ fontSize: '13px', fontWeight: '700', color: rec.color }}>{rec.title}</div>
        </div>
        <div style={{
          fontSize: '9px', color: rec.color, fontWeight: '700',
          backgroundColor: `${rec.color}22`, padding: '2px 8px', borderRadius: '10px',
          whiteSpace: 'nowrap',
        }}>
          {rec.metric}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6', marginBottom: '10px' }}>
        {rec.desc}
      </div>

      {/* Show the rule — important for hackathon viva! */}
      <div style={{
        backgroundColor: 'white', borderRadius: '6px',
        padding: '5px 8px', border: `1px solid ${rec.border}`,
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>RULE:</span>
        <code style={{ fontSize: '10px', color: rec.color, fontFamily: 'monospace' }}>{rec.rule}</code>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Dashboard({ onBack }) {
  const [filter,   setFilter]   = useState('All')
  const [roads,    setRoads]    = useState(staticRoads)
  const [peakData, setPeakData] = useState(staticPeakData)
  const [loading,  setLoading]  = useState(true)

  // Live TomTom incidents for recommendations and metrics bar
  const { incidents, jams, accidents, closures, avgDelayMin, source: trafficSource } = useTrafficData()

  // ── Fetch backend data (roads table + peak chart) ─────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // User-reported incidents  → road table
        const incRes = await incidentsAPI.getAll({ limit: 100 })
        if (incRes.success && incRes.data?.length > 0) {
          const transformed = transformIncidentsToRoads(incRes.data)
          if (transformed.length > 0) setRoads(transformed)
        }

        // Peak analysis → bar chart
        const peakRes = await trafficAPI.getPeakAnalysis()
        if (peakRes.success && peakRes.data?.hourlyData) {
          const formatted = peakRes.data.hourlyData.slice(0, 16).map(h => ({
            hour:  (parseInt(h.label) >= 12 ? `${parseInt(h.label) === 12 ? 12 : parseInt(h.label) - 12}pm` : `${h.label.split(':')[0]}am`),
            level: Math.min(100, h.count * 10 + h.highCount * 15),
          }))
          if (formatted.length > 0) setPeakData(formatted)
        }
      } catch (err) {
        console.warn('Dashboard: backend data fetch failed, using static fallback:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered       = filter === 'All' ? roads : roads.filter(r => r.status === filter)
  const recommendations = generateRecommendations(incidents, roads)

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'white', padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🚦</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>SmartTraffic</span>
            <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
              Authority View
            </span>
          </div>
          {['Solutions', 'Pricing', 'Case Studies', 'Network Status'].map(item => (
            <span key={item} style={{ fontSize: '13px', color: '#64748b', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.color = '#0f172a'}
              onMouseLeave={e => e.target.style.color = '#64748b'}
            >{item}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live badge */}
          <div style={{
            fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 10px',
            borderRadius: '20px', border: '1px solid #bbf7d0',
          }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#16a34a', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 4px #22c55e' }} />
            Live
          </div>
          {/* Data source */}
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {trafficSource === 'tomtom' ? '🛰 TomTom Data' : trafficSource === 'backend' ? '📡 Backend Data' : ''}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Delhi Traffic Control</span>
          <div
            onClick={onBack}
            style={{
              fontSize: '13px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
              padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '500',
            }}
          >
            ← Driver View
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* ── Real Metrics Bar ────────────────────────────────────────── */}
        <LiveMetricsBar incidents={incidents} roads={roads} avgDelayMin={avgDelayMin} />

        {/* ── Rule-Based Recommendations ──────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                Smart Recommendations
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Rule-based analysis from live traffic data — no ML required
              </div>
            </div>
            <div style={{
              fontSize: '11px', backgroundColor: recommendations[0]?.color === '#10b981' ? '#f0fdf4' : '#fef2f2',
              color: recommendations[0]?.color === '#10b981' ? '#10b981' : '#ef4444',
              padding: '3px 10px', borderRadius: '20px',
              border: `1px solid ${recommendations[0]?.color === '#10b981' ? '#bbf7d0' : '#fecaca'}`,
              fontWeight: '600',
            }}>
              {recommendations.length} active rule{recommendations.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <StatCard
            label="Total Incidents"
            value={incidents.length > 0 ? incidents.length : roads.reduce((s, r) => s + r.incidents, 0)}
            sub="Live from TomTom / backend"
            color="#0f172a"
            icon="🗺️"
          />
          <StatCard
            label="Traffic Jams"
            value={jams.length}
            sub="Active jam detections"
            color="#f97316"
            icon="🚗"
          />
          <StatCard
            label="Active Accidents"
            value={accidents.length}
            sub={accidents.length > 0 ? 'Requires response' : 'None detected'}
            color={accidents.length > 0 ? '#ef4444' : '#10b981'}
            icon="⚠️"
          />
          <StatCard
            label="Free Flow Roads"
            value={roads.filter(r => r.status === 'Free').length}
            sub="Optimal conditions"
            color="#10b981"
            icon="✅"
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>

          {/* ── Road Status Table ──────────────────────────────────────── */}
          <div style={{ flex: 1 }}>
            <div style={{
              backgroundColor: 'white', border: '1px solid #e2e8f0',
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Road Status Overview</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    {loading ? 'Loading from backend...' : 'Live telemetry — from reported incidents'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['All', 'Heavy', 'Moderate', 'Free'].map(f => (
                    <div key={f} onClick={() => setFilter(f)} style={{
                      fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
                      cursor: 'pointer', fontWeight: '500', transition: 'all 0.15s',
                      backgroundColor: filter === f ? '#0f172a' : '#f1f5f9',
                      color: filter === f ? 'white' : '#64748b',
                    }}>{f}</div>
                  ))}
                </div>
              </div>

              {/* Column headers */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 2fr 0.5fr',
                padding: '8px 16px', fontSize: '11px', color: '#94a3b8',
                borderBottom: '1px solid #f1f5f9', fontWeight: '700', letterSpacing: '0.4px',
              }}>
                <span>ROAD NAME</span><span>STATUS</span>
                <span>CONGESTION</span><span>SIGNAL ADVICE</span><span />
              </div>

              {filtered.map((road, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 2fr 0.5fr',
                  padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                  alignItems: 'center', fontSize: '13px', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{road.name}</span>
                  <span style={{
                    display: 'inline-block', fontSize: '11px', fontWeight: '600',
                    color: road.color, backgroundColor: road.bg,
                    padding: '2px 8px', borderRadius: '20px', width: 'fit-content',
                  }}>{road.status}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1, height: '5px', backgroundColor: '#f1f5f9',
                      borderRadius: '3px', overflow: 'hidden', maxWidth: '80px',
                    }}>
                      <div style={{
                        height: '100%', width: `${road.level}%`,
                        backgroundColor: road.color, borderRadius: '3px',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{road.level}%</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{road.signal}</span>
                  <span style={{ fontSize: '12px', color: road.incidents > 0 ? '#ef4444' : '#94a3b8' }}>
                    {road.incidents > 0 ? `${road.incidents} ⚠️` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Column: Peak Chart ──────────────────────────────── */}
          <div style={{ width: '320px' }}>
            <div style={{
              backgroundColor: 'white', border: '1px solid #e2e8f0',
              borderRadius: '12px', padding: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                Peak Hours Analysis
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                Based on historical incident patterns (backend)
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={peakData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="level" radius={[3, 3, 0, 0]}>
                    {peakData.map((entry, i) => (
                      <Cell key={i} fill={getBarColor(entry.level)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Summary note */}
              <div style={{
                marginTop: '10px', padding: '8px 10px',
                backgroundColor: '#f8fafc', borderRadius: '8px',
                fontSize: '11px', color: '#64748b', lineHeight: '1.5',
                border: '1px solid #e2e8f0',
              }}>
                ⏰ Busiest windows: <strong>8–10 AM</strong> and <strong>5–8 PM</strong>
                <br />Best travel time: 11 AM – 4 PM or after 9 PM
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}