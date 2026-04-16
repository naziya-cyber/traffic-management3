const Features = () => {
  const features = [
    { title: "Traffic Heatmap", icon: "🌡️" },
    { title: "Traffic Prediction", icon: "🔮" },
    { title: "Smart Route Suggestion", icon: "🛣️" },
    { title: "Accident Alerts", icon: "🚨" }
  ];

  return (
    <section>
      <h2>Features</h2>
      <div className="grid">
        {features.map(f => (
          <div key={f.title} className="card feature-card">
            <span style={{fontSize: '2rem'}}>{f.icon}</span>
            <h4>{f.title}</h4>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;