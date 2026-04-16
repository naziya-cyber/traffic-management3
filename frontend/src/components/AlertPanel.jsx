/**
 * AlertPanel.jsx
 *
 * Real-time traffic sidebar panel.
 * Data source: useTrafficData hook (TomTom API v5 → backend fallback)
 *
 * Shows:
 *  - Live counters: JAMS / ACCIDENTS / CLOSURES / AVG DELAY
 *  - Predictive traffic bars (time-of-day logic, honest & explainable)
 *  - Scrollable live incident feed from TomTom / backend
 */

import { useState, useEffect } from 'react'
import { useTrafficData } from '../hooks/useTrafficData'

// ── Animated count-up hook ──────────────────────────────────────────────────
function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let current = 0
    const step = Math.max(1, Math.ceil(target / (duration / 16)))
    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      setValue(current)
      if (current >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

// ── Honest time-of-day traffic prediction ──────────────────────────────────
function getLocalPrediction() {
  const h   = new Date().getHours()
  const day = new Date().getDay()
  const isWeekend = day === 0 || day === 6
  if (isWeekend)                             return { label: 'Moderate',   pct: 48, futurePct: 30, tip: 'Weekend — roads usually clear by midday' }
  if (h >= 8  && h <= 10)                    return { label: 'Heavy',      pct: 88, futurePct: 95, tip: 'Peak morning rush — avoid NH-48 & Ring Road' }
  if (h >= 17 && h <= 20)                    return { label: 'Very Heavy', pct: 93, futurePct: 78, tip: 'Peak evening rush — use alternate routes' }
  if (h >= 11 && h <= 16)                    return { label: 'Moderate',   pct: 52, futurePct: 32, tip: 'Off-peak window — good time to travel' }
  return                                           { label: 'Low',         pct: 18, futurePct: 12, tip: 'Roads are clear — safe to travel now' }
}

function barColor(pct) {
  if (pct >= 70) return '#ef4444'
  if (pct >= 40) return '#f59e0b'
  return '#10b981'
}

function timeAgo(date) {
  if (!date) return ''
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1)  return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} min ago`
  return `${Math.floor(mins / 60)}h ago`
}

// ── Stat counter card ───────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon }) {
  const animVal = useCountUp(typeof value === 'number' ? value : 0)
  return (
    <div style={{
      flex: 1,
      padding: '10px 6px',
      textAlign: 'center',
      backgroundColor: bg,
      borderRight: '1px solid #e2e8f0',
    }}>
      <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.4px', marginBottom: '4px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: '800', color, fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? animVal : value}
      </div>
    </div>
  )
}

// ── Single incident row ─────────────────────────────────────────────────────
function IncidentRow({ inc }) {
  return (
    <div style={{
      padding: '9px 14px',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      cursor: 'default',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {/* Icon badge */}
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
        backgroundColor: `${inc.color}18`,
        border: `1px solid ${inc.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px',
      }}>
        {inc.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Type + severity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{inc.label}</span>
          <span style={{
            fontSize: '9px', fontWeight: '700', color: inc.color,
            backgroundColor: `${inc.color}18`, borderRadius: '10px', padding: '1px 6px', flexShrink: 0,
          }}>
            {inc.severityLabel}
          </span>
        </div>

        {/* from → to */}
        {inc.from && (
          <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inc.from}{inc.to ? ` → ${inc.to}` : ''}
          </div>
        )}

        {/* Delay + road tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
          {inc.delay > 0 && (
            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>
              +{Math.round(inc.delay / 60)} min delay
            </span>
          )}
          {inc.road && (
            <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>{inc.road}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AlertPanel({ newIncident }) {
  const { incidents, jams, accidents, closures, avgDelayMin, loading, error, source, lastUpdated, refresh } = useTrafficData()
  const [allIncidents, setAllIncidents] = useState([])
  const [prediction]  = useState(getLocalPrediction)

  // Merge user-reported incidents from ReportModal with live feed
  useEffect(() => {
    setAllIncidents(incidents)
  }, [incidents])

  useEffect(() => {
    if (!newIncident) return
    const mapped = {
      id:           Date.now(),
      incType:      'jam',
      label:        newIncident.type,
      icon:         newIncident.icon || '📍',
      color:        '#ef4444',
      severityLabel: 'Minor',
      from:         newIncident.location,
      to:           '',
      delay:        0,
      length:       0,
      description:  newIncident.description,
      road:         newIncident.location,
    }
    setAllIncidents(prev => [mapped, ...prev])
  }, [newIncident])

  return (
    <div style={{
      width: '280px',
      backgroundColor: 'white',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      fontSize: '13px',
    }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🚦 Live Traffic
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Data source badge */}
            <span style={{
              fontSize: '9px', fontWeight: '700', letterSpacing: '0.4px',
              padding: '2px 7px', borderRadius: '10px',
              backgroundColor: source === 'tomtom' ? '#0ea5e920' : '#f59e0b20',
              color:           source === 'tomtom' ? '#38bdf8'  : '#f59e0b',
              border: `1px solid ${source === 'tomtom' ? '#0ea5e844' : '#f59e0b44'}`,
            }}>
              {source === 'tomtom' ? '🛰 TomTom' : source === 'backend' ? '📡 Backend' : '—'}
            </span>

            {/* Live pulsing dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: loading ? '#f59e0b' : '#22c55e',
                display: 'inline-block',
                boxShadow: loading ? 'none' : '0 0 6px #22c55e88',
                animation: 'pulse 2s infinite',
              }} />
              <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
            </div>
          </div>
        </div>

        {/* Last updated */}
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Updated {lastUpdated ? timeAgo(lastUpdated) : '—'}</span>
          <span
            onClick={refresh}
            style={{ cursor: 'pointer', color: '#38bdf8', textDecoration: 'underline' }}
          >↻ Refresh</span>
        </div>
      </div>

      {/* ── Stat counters ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
        <StatCard label="JAMS"      value={jams.length}      color="#f97316" bg="#fff7ed" icon="🚗" />
        <StatCard label="ACCIDENTS" value={accidents.length} color="#ef4444" bg="#fef2f2" icon="⚠️" />
        <StatCard label="CLOSURES"  value={closures.length}  color="#8b5cf6" bg="#f5f3ff" icon="🚫" />
      </div>

      {/* Avg delay full-width */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: avgDelayMin > 15 ? '#fef2f2' : avgDelayMin > 5 ? '#fffbeb' : '#f0fdf4',
      }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>⏱ AVG DELAY</span>
        <span style={{
          fontSize: '15px', fontWeight: '800',
          color: avgDelayMin > 15 ? '#ef4444' : avgDelayMin > 5 ? '#f59e0b' : '#10b981',
        }}>
          {avgDelayMin > 0 ? `${avgDelayMin} min` : '< 1 min'}
        </span>
      </div>

      {/* ── Predictive analysis (honest: time-of-day logic) ────────── */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{
          fontSize: '10px', color: '#94a3b8', fontWeight: '700',
          letterSpacing: '0.5px', marginBottom: '10px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>PREDICTIVE ANALYSIS — NEXT 60 MIN</span>
          <span style={{ color: '#cbd5e1', fontWeight: '400' }}>time-of-day model</span>
        </div>

        {[
          { label: `Now — ${prediction.label}`,      pct: prediction.pct      },
          { label: `+30 min — expected change`,       pct: prediction.futurePct },
        ].map((bar, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
              <span>{bar.label}</span>
              <span style={{ color: barColor(bar.pct), fontWeight: '700' }}>{bar.pct}%</span>
            </div>
            <div style={{ height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${bar.pct}%`,
                backgroundColor: barColor(bar.pct),
                borderRadius: '3px', transition: 'width 1.2s ease',
              }} />
            </div>
          </div>
        ))}

        <div style={{
          marginTop: '8px', padding: '8px 10px',
          backgroundColor: '#f8fafc', borderRadius: '8px',
          fontSize: '11px', color: '#64748b', lineHeight: '1.5',
          border: '1px solid #e2e8f0',
        }}>
          📊 {prediction.tip}
        </div>
      </div>

      {/* ── Live feed ──────────────────────────────────────────────── */}
      <div style={{ padding: '8px 14px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>
          LIVE INCIDENTS
        </span>
        <span style={{ fontSize: '10px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '10px', padding: '1px 8px', fontWeight: '700' }}>
          {allIncidents.length} active
        </span>
      </div>

      <div style={{ flex: 1 }}>
        {/* Loading state */}
        {loading && (
          <div style={{ padding: '24px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            Loading live traffic data...
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{ padding: '16px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>📡</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{error}</div>
            <div onClick={refresh} style={{ marginTop: '8px', fontSize: '11px', color: '#3b82f6', cursor: 'pointer' }}>
              Try again ↻
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && allIncidents.length === 0 && (
          <div style={{ padding: '24px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>No active incidents</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Delhi roads are clear right now</div>
          </div>
        )}

        {/* Incidents list */}
        {!loading && allIncidents.map(inc => (
          <IncidentRow key={inc.id} inc={inc} />
        ))}
      </div>
    </div>
  )
}