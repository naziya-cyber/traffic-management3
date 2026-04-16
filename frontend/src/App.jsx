import { useState } from 'react'
import Map from './components/Map'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AlertPanel from './components/AlertPanel'
import ReportModal from './components/ReportModal'
import RoutePanel from './components/RoutePanel'
import RoutePlannerPanel from './components/RoutePlannerPanel'
import Dashboard from './Pages/Dashboard'

function App() {
  const [showModal,          setShowModal]          = useState(false)
  const [newIncident,        setNewIncident]        = useState(null)
  const [selectedRoad,       setSelectedRoad]       = useState(null)
  const [showDashboard,      setShowDashboard]      = useState(false)
  const [showRoutePlanner,   setShowRoutePlanner]   = useState(false)
  const [activeTab,          setActiveTab]          = useState('map')

  if (showDashboard) {
    return <Dashboard onBack={() => setShowDashboard(false)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc' }}>

      <Navbar
        onReportClick={() => setShowModal(true)}
        onDashboardClick={() => setShowDashboard(true)}
        onRoutePlannerClick={() => {
          setShowRoutePlanner(prev => !prev)
          setSelectedRoad(null) // close road panel if open
        }}
        showingRoutePlanner={showRoutePlanner}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <AlertPanel newIncident={newIncident} />

        {/* Map area — route planner floats above it */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Map onRoadClick={(road) => {
            setSelectedRoad(road)
            setShowRoutePlanner(false) // close planner when clicking a road
          }} />

          {/* Floating Route Planner Panel */}
          {showRoutePlanner && (
            <RoutePlannerPanel onClose={() => setShowRoutePlanner(false)} />
          )}
        </div>
      </div>

      {/* Road-click Route Panel (bottom slide-up) */}
      <RoutePanel
        road={selectedRoad}
        onClose={() => setSelectedRoad(null)}
      />

      {/* Report Incident Modal */}
      {showModal && (
        <ReportModal
          onClose={() => setShowModal(false)}
          onSubmit={(incident) => {
            setNewIncident(incident)
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

export default App