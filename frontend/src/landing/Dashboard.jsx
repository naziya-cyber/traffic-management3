import React from "react";

const Dashboard = () => {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <iframe
        src="/client/index.html"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Smart Traffic Dashboard"
      ></iframe>
    </div>
  );
};

export default Dashboard;