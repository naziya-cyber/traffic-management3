/**
 * Navbar.jsx
 *
 * Top navigation bar with:
 * - SmartTraffic branding
 * - 🗺️ Find Route button (opens Route Planner Panel)
 * - 🔴 Live badge
 * - Authority View toggle
 * - Report Incident button
 */
export default function Navbar({ onReportClick, onDashboardClick, onRoutePlannerClick, showingRoutePlanner }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '0 20px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #e2e8f0',
      zIndex: 1000,
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    }}>

      {/* ── Left: Logo ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '22px' }}>🚦</span>
        <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
          SmartTraffic
        </span>
        <span style={{
          fontSize: '9px', color: '#64748b', backgroundColor: '#f1f5f9',
          padding: '2px 8px', borderRadius: '4px', fontWeight: '600', letterSpacing: '0.5px',
        }}>
          DELHI
        </span>
      </div>

      {/* ── Center: What can I do here? ──────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Most prominent — Find Route */}
        <div
          onClick={onRoutePlannerClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: showingRoutePlanner ? '#0f172a' : '#3b82f6',
            color: 'white',
            padding: '7px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '13px',
            boxShadow: showingRoutePlanner ? 'none' : '0 2px 8px rgba(59,130,246,0.4)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!showingRoutePlanner) e.currentTarget.style.backgroundColor = '#2563eb' }}
          onMouseLeave={e => { if (!showingRoutePlanner) e.currentTarget.style.backgroundColor = '#3b82f6' }}
        >
          <span>🗺️</span>
          <span>{showingRoutePlanner ? 'Close Planner' : 'Find Best Route'}</span>
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />

        {/* Live badge */}
        <div style={{
          fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px',
          backgroundColor: '#f0fdf4', color: '#16a34a',
          padding: '4px 10px', borderRadius: '20px', border: '1px solid #bbf7d0',
        }}>
          <span style={{
            width: '6px', height: '6px', backgroundColor: '#16a34a',
            borderRadius: '50%', display: 'inline-block',
            boxShadow: '0 0 5px #22c55e',
            animation: 'np 2s infinite',
          }} />
          <style>{`@keyframes np { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
          Live
        </div>

        {/* Authority View */}
        <div
          onClick={onDashboardClick}
          style={{
            fontSize: '13px', backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0', padding: '6px 14px',
            borderRadius: '8px', cursor: 'pointer', color: '#475569', fontWeight: '600',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#475569' }}
        >
          📊 Authority View
        </div>

        {/* Report Incident */}
        <div
          onClick={onReportClick}
          style={{
            fontSize: '13px', backgroundColor: '#ef4444',
            color: 'white', padding: '6px 14px',
            borderRadius: '8px', cursor: 'pointer', fontWeight: '700',
            boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ef4444'}
        >
          <span>🚨</span> Report Incident
        </div>
      </div>
    </div>
  )
}