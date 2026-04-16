import { MapContainer, TileLayer, Polyline, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { trafficAPI } from '../api/trafficApi'

const roads = [
  {
    name: 'NH-48 — Heavy Traffic',
    color: '#ef4444',
    positions: [
      [28.5050, 77.0850], [28.5120, 77.0980], [28.5200, 77.1100],
      [28.5290, 77.1220], [28.5400, 77.1350], [28.5500, 77.1480],
      [28.5600, 77.1600], [28.5700, 77.1720], [28.5800, 77.1850],
      [28.5900, 77.1950], [28.6000, 77.2050], [28.6080, 77.2090],
    ],
  },
  {
    name: 'Ring Road — Moderate Traffic',
    color: '#f59e0b',
    positions: [
      [28.6480, 77.1580], [28.6460, 77.1700], [28.6420, 77.1850],
      [28.6370, 77.1970], [28.6300, 77.2080], [28.6220, 77.2160],
      [28.6130, 77.2240], [28.6020, 77.2310], [28.5910, 77.2390],
      [28.5800, 77.2440], [28.5690, 77.2470], [28.5580, 77.2490],
    ],
  },
  {
    name: 'Mathura Road — Heavy Traffic',
    color: '#ef4444',
    positions: [
      [28.6200, 77.2350], [28.6120, 77.2400], [28.6020, 77.2460],
      [28.5920, 77.2530], [28.5820, 77.2600], [28.5720, 77.2680],
      [28.5620, 77.2760], [28.5520, 77.2840], [28.5420, 77.2920],
    ],
  },
  {
    name: 'Rohtak Road — Moderate Traffic',
    color: '#f59e0b',
    positions: [
      [28.6580, 77.2020], [28.6610, 77.1850], [28.6640, 77.1680],
      [28.6660, 77.1510], [28.6690, 77.1340], [28.6710, 77.1170],
      [28.6740, 77.1000], [28.6760, 77.0830],
    ],
  },
  {
    name: 'Noida Expressway — Free Flow',
    color: '#10b981',
    positions: [
      [28.6200, 77.3100], [28.6100, 77.3180], [28.6000, 77.3260],
      [28.5900, 77.3340], [28.5800, 77.3420], [28.5700, 77.3500],
      [28.5600, 77.3580], [28.5500, 77.3660],
    ],
  },
  {
    name: 'Dwarka Expressway — Free Flow',
    color: '#10b981',
    positions: [
      [28.6450, 77.0250], [28.6390, 77.0400], [28.6320, 77.0550],
      [28.6250, 77.0680], [28.6170, 77.0800], [28.6090, 77.0920],
    ],
  },
  {
    name: 'Outer Ring Road — Free Flow',
    color: '#10b981',
    positions: [
      [28.7100, 77.1400], [28.7050, 77.1600], [28.6980, 77.1800],
      [28.6880, 77.2000], [28.6760, 77.2200], [28.6620, 77.2400],
      [28.6460, 77.2600], [28.6280, 77.2800], [28.6100, 77.2980],
    ],
  },
  {
    name: 'Connaught Place — Heavy Traffic',
    color: '#ef4444',
    positions: [
      [28.6380, 77.2050], [28.6370, 77.2120], [28.6350, 77.2190],
      [28.6320, 77.2240], [28.6290, 77.2260], [28.6260, 77.2240],
      [28.6240, 77.2200], [28.6240, 77.2130], [28.6260, 77.2070],
      [28.6300, 77.2040], [28.6340, 77.2040], [28.6380, 77.2050],
    ],
  },
  {
    name: 'Chandni Chowk — Heavy Traffic',
    color: '#ef4444',
    positions: [
      [28.6560, 77.2140], [28.6550, 77.2200], [28.6540, 77.2270],
      [28.6530, 77.2340], [28.6520, 77.2410], [28.6510, 77.2470],
    ],
  },
  {
    name: 'Lajpat Nagar — Moderate',
    color: '#f59e0b',
    positions: [
      [28.5720, 77.2280], [28.5710, 77.2350], [28.5700, 77.2430],
      [28.5690, 77.2510], [28.5680, 77.2590], [28.5690, 77.2670],
    ],
  },
]

// Map location names to road indices for dynamic coloring
const locationToRoadMap = {
  'NH-48': 0,
  'Ring Road': 1,
  'Mathura Road': 2,
  'Rohtak Road': 3,
  'Noida Expressway': 4,
  'Dwarka Expressway': 5,
  'Outer Ring Road': 6,
  'Connaught Place': 7,
  'Chandni Chowk': 8,
  'Lajpat Nagar': 9,
}

function getTrafficColor(intensity) {
  if (intensity === 'Critical' || intensity === 'High') return '#ef4444'
  if (intensity === 'Medium') return '#f59e0b'
  return '#10b981'
}

export default function Map({ onRoadClick }) {
  const [roadColors, setRoadColors] = useState(roads.map(r => r.color))

  // Fetch heatmap data and update road colors based on real traffic
  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const response = await trafficAPI.getHeatmap()
        if (response.success && response.data) {
          const newColors = [...roadColors]
          response.data.forEach(heatmapItem => {
            // Find matching road by location name
            for (const [locationName, roadIndex] of Object.entries(locationToRoadMap)) {
              if (heatmapItem.location.toLowerCase().includes(locationName.toLowerCase())) {
                newColors[roadIndex] = getTrafficColor(heatmapItem.intensity)
                break
              }
            }
          })
          setRoadColors(newColors)
        }
      } catch (err) {
        console.warn('Failed to fetch heatmap, using static colors:', err.message)
      }
    }

    fetchHeatmap()
  }, [])

  return (
    <MapContainer
      center={[28.6280, 77.2090]}
      zoom={12}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="OpenStreetMap"
      />
      {roads.map((road, i) => (
        <Polyline
          key={i}
          positions={road.positions}
          pathOptions={{
            color: roadColors[i],
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: 2,
          }}
          eventHandlers={{
            click: () => onRoadClick && onRoadClick(road.name),
            mouseover: (e) => e.target.setStyle({ weight: 8, opacity: 1 }),
            mouseout: (e) => e.target.setStyle({ weight: 5, opacity: 0.85 }),
          }}
        >
          <Tooltip sticky>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>{road.name}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Click for route suggestions</div>
          </Tooltip>
        </Polyline>
      ))}
    </MapContainer>
  )
}