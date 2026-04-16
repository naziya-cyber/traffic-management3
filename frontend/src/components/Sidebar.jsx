const tabs = [
  { id: 'map', icon: '🗺️', label: 'Live Map' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'predictions', icon: '🤖', label: 'Predictions' },
  { id: 'signals', icon: '🚦', label: 'Signals' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <div style={{
      width: '56px',
      backgroundColor: 'white',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '12px',
      gap: '4px',
    }}>
      <div style={{
        width: '32px', height: '32px',
        backgroundColor: '#10b981',
        borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '16px',
        fontSize: '16px',
      }}>🚦</div>

      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          title={tab.label}
          style={{
            width: '40px', height: '40px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            cursor: 'pointer',
            backgroundColor: activeTab === tab.id ? '#f0fdf4' : 'transparent',
            border: activeTab === tab.id ? '1px solid #bbf7d0' : '1px solid transparent',
          }}
        >
          {tab.icon}
        </div>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{
        width: '32px', height: '32px',
        backgroundColor: '#f1f5f9',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '12px',
        fontSize: '14px',
        cursor: 'pointer',
      }}>N</div>
    </div>
  )
}