import React, { useState, useEffect, useCallback } from 'react'

// Vehicle types with their configurations
const VEHICLE_TYPES = {
  car: {
    width: 48,
    height: 20,
    colors: {
      smooth: '#10b981',
      moderate: '#f59e0b',
      heavy: '#ef4444'
    }
  },
  bus: {
    width: 72,
    height: 26,
    colors: {
      smooth: '#3b82f6',
      moderate: '#f59e0b',
      heavy: '#ef4444'
    }
  }
}

// Generate initial vehicles
const generateVehicles = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `vehicle-${i}-${Date.now()}`,
    type: Math.random() > 0.7 ? 'bus' : 'car',
    direction: Math.random() > 0.5 ? 'left' : 'right',
    position: Math.random() * 100,
    speed: 0.3 + Math.random() * 0.4,
    trafficState: Math.random() > 0.6 ? 'smooth' : Math.random() > 0.3 ? 'moderate' : 'heavy',
    delay: Math.random() * 2
  }))
}

export default function TrafficScene() {
  const [vehicles, setVehicles] = useState([])
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [hoveredVehicle, setHoveredVehicle] = useState(null)

  // Initialize vehicles
  useEffect(() => {
    setVehicles(generateVehicles(8))
  }, [])

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)

    const handleChange = (e) => setIsReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Animation loop for vehicle movement
  useEffect(() => {
    if (isReducedMotion) return

    const interval = setInterval(() => {
      setVehicles(prevVehicles =>
        prevVehicles.map(vehicle => {
          let newPosition = vehicle.position

          // Move vehicle based on direction
          if (vehicle.direction === 'right') {
            newPosition = (vehicle.position + vehicle.speed * (vehicle.trafficState === 'heavy' ? 0.3 : vehicle.trafficState === 'moderate' ? 0.6 : 1)) % 100
          } else {
            newPosition = vehicle.position - vehicle.speed * (vehicle.trafficState === 'heavy' ? 0.3 : vehicle.trafficState === 'moderate' ? 0.6 : 1)
            if (newPosition < 0) newPosition = 100 + newPosition
          }

          // Occasionally change traffic state
          const shouldChangeState = Math.random() > 0.995
          let newTrafficState = vehicle.trafficState
          if (shouldChangeState) {
            const states = ['smooth', 'moderate', 'heavy']
            newTrafficState = states[Math.floor(Math.random() * states.length)]
          }

          return {
            ...vehicle,
            position: newPosition,
            trafficState: newTrafficState
          }
        })
      )
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [isReducedMotion])

  const getVehicleColor = useCallback((vehicle) => {
    return VEHICLE_TYPES[vehicle.type].colors[vehicle.trafficState]
  }, [])

  const getTooltipText = useCallback((trafficState) => {
    switch (trafficState) {
      case 'smooth': return 'Smooth flow'
      case 'moderate': return 'Moderate traffic'
      case 'heavy': return 'Heavy congestion'
      default: return ''
    }
  }, [])

  if (isReducedMotion) {
    return (
      <div className="traffic-scene-static">
        <div className="traffic-scene-static__road">
          <div className="traffic-scene-static__lanes">
            {[1, 2, 3].map(lane => (
              <div key={lane} className="traffic-scene-static__lane" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="traffic-scene">
      {/* Background elements */}
      <div className="traffic-scene__background">
        {/* Distant buildings */}
        <div className="traffic-scene__buildings">
          {[...Array(5)].map((_, i) => (
            <div
              key={`building-${i}`}
              className="traffic-scene__building"
              style={{
                left: `${15 + i * 20}%`,
                height: `${60 + Math.random() * 40}px`,
                width: `${40 + Math.random() * 20}px`
              }}
            />
          ))}
        </div>

        {/* Trees */}
        <div className="traffic-scene__trees">
          {[...Array(6)].map((_, i) => (
            <div
              key={`tree-${i}`}
              className="traffic-scene__tree"
              style={{ left: `${8 + i * 16}%` }}
            >
              <div className="traffic-scene__tree-trunk" />
              <div className="traffic-scene__tree-top" />
            </div>
          ))}
        </div>

        {/* Street lights */}
        <div className="traffic-scene__street-lights">
          {[...Array(4)].map((_, i) => (
            <div
              key={`light-${i}`}
              className="traffic-scene__street-light"
              style={{ left: `${20 + i * 25}%` }}
            >
              <div className="traffic-scene__light-pole" />
              <div className="traffic-scene__light-head">
                <div className="traffic-scene__light-glow" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Road */}
      <div className="traffic-scene__road">
        {/* Road surface */}
        <div className="traffic-scene__road-surface" />

        {/* Lane markings */}
        <div className="traffic-scene__lanes">
          <div className="traffic-scene__lane-marker" />
          <div className="traffic-scene__lane-marker" />
        </div>

        {/* Road edge lines */}
        <div className="traffic-scene__road-edge traffic-scene__road-edge--top" />
        <div className="traffic-scene__road-edge traffic-scene__road-edge--bottom" />

        {/* Vehicles */}
        {vehicles.map((vehicle, index) => (
          <div
            key={vehicle.id}
            className={`traffic-scene__vehicle traffic-scene__vehicle--${vehicle.type}`}
            style={{
              left: `${vehicle.position}%`,
              transform: `translateX(${vehicle.direction === 'left' ? '-100%' : '0'})`,
              transition: `left ${2 / vehicle.speed}s linear`,
              zIndex: 10 + index
            }}
            onMouseEnter={() => setHoveredVehicle(vehicle.id)}
            onMouseLeave={() => setHoveredVehicle(null)}
          >
            <div
              className="traffic-scene__vehicle-body"
              style={{
                backgroundColor: getVehicleColor(vehicle),
                width: `${VEHICLE_TYPES[vehicle.type].width}px`,
                height: `${VEHICLE_TYPES[vehicle.type].height}px`
              }}
            >
              {/* Vehicle windows */}
              <div className="traffic-scene__vehicle-windows">
                {[...Array(vehicle.type === 'bus' ? 3 : 2)].map((_, i) => (
                  <div
                    key={`window-${i}`}
                    className="traffic-scene__vehicle-window"
                    style={{
                      width: vehicle.type === 'bus' ? '12px' : '14px'
                    }}
                  />
                ))}
              </div>

              {/* Wheels */}
              <div className="traffic-scene__vehicle-wheels">
                <div className="traffic-scene__vehicle-wheel" />
                <div className="traffic-scene__vehicle-wheel" />
              </div>

              {/* Traffic state indicator */}
              <div
                className={`traffic-scene__vehicle-indicator traffic-scene__vehicle-indicator--${vehicle.trafficState}`}
              >
                <div className="traffic-scene__vehicle-indicator-light" />
              </div>

              {/* Tooltip */}
              {hoveredVehicle === vehicle.id && (
                <div className="traffic-scene__vehicle-tooltip">
                  {getTooltipText(vehicle.trafficState)}
                </div>
              )}
            </div>

            {/* Vehicle shadow */}
            <div
              className="traffic-scene__vehicle-shadow"
              style={{
                width: `${VEHICLE_TYPES[vehicle.type].width}px`
              }}
            />
          </div>
        ))}
      </div>

      {/* Foreground elements */}
      <div className="traffic-scene__foreground">
        <div className="traffic-scene__roadside" />
      </div>
    </div>
  )
}
