import { useState } from 'react'
import { incidentsAPI } from '../api/trafficApi'

const incidentTypes = [
  { label: 'Heavy Traffic', icon: '🔴' },
  { label: 'Accident', icon: '⚠️' },
  { label: 'Road Blocked', icon: '🚧' },
  { label: 'Flooding', icon: '🌊' },
  { label: 'Breakdown', icon: '🚗' },
  { label: 'Construction', icon: '👷' },
]

const locations = [
  'Connaught Place', 'India Gate', 'NH-48 Highway',
  'Lajpat Nagar', 'Dwarka Expressway', 'Noida Expressway',
  'Chandni Chowk', 'Rohtak Road', 'Ring Road',
  'Mathura Road', 'Outer Ring Road', 'Jamia Nagar',
]

export default function ReportModal({ onClose, onSubmit }) {
  const [selectedType, setSelectedType] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!selectedType || !selectedLocation) return
    setSubmitted(true)

    // Call backend API to create incident
    incidentsAPI.create({
      type: selectedType.label,
      location: selectedLocation,
      description: description || '',
      source: 'Crowdsourcing',
    })
      .then(response => {
        if (response.success) {
          onSubmit({
            type: selectedType.label,
            icon: selectedType.icon,
            location: selectedLocation,
            description: description || 'No description',
            time: 'Just now',
          })
          onClose()
        }
      })
      .catch(err => {
        console.error('Failed to report incident:', err)
        alert('Failed to submit incident. Please try again.')
        setSubmitted(false)
      })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#0f0f1a',
        border: '1px solid #2a2a3e',
        borderRadius: '16px',
        width: '420px',
        padding: '24px',
        color: 'white',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              🚨 Report Incident
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
              Help others by reporting what you see
            </div>
          </div>
          <div
            onClick={onClose}
            style={{
              cursor: 'pointer',
              color: '#555',
              fontSize: '20px',
              lineHeight: 1,
            }}
          >
            ✕
          </div>
        </div>

        {/* Incident Type */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
            INCIDENT TYPE
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
          }}>
            {incidentTypes.map(type => (
              <div
                key={type.label}
                onClick={() => setSelectedType(type)}
                style={{
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedType?.label === type.label ? '#e63946' : '#2a2a3e'}`,
                  backgroundColor: selectedType?.label === type.label ? '#1a0a0e' : '#16213e',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                  {type.icon}
                </div>
                {type.label}
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
            LOCATION
          </div>
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#16213e',
              border: '1px solid #2a2a3e',
              borderRadius: '8px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value=''>Select a location...</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
            DESCRIPTION (optional)
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. 3 lanes blocked, police on scene..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#16213e',
              border: '1px solid #2a2a3e',
              borderRadius: '8px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Submit Button */}
        <div
          onClick={handleSubmit}
          style={{
            backgroundColor: submitted ? '#4ade80' : '#e63946',
            color: 'white',
            padding: '12px',
            borderRadius: '10px',
            textAlign: 'center',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.3s',
          }}
        >
          {submitted ? '✅ Incident Reported! Adding to feed...' : 'Submit Report'}
        </div>

      </div>
    </div>
  )
}