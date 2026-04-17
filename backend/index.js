const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/smart_traffic";
const JWT_SECRET = process.env.JWT_SECRET || "smart_traffic_secret_key_change_in_prod";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => {
    console.error("MongoDB Error ❌:", err.message);
    console.log("⚠️  Server still running without DB...");
  });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  }
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

const IncidentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true,
    enum: ["Accident", "Traffic Jam", "Road Block", "Speed Issue", "Busy Road", "Other", "Heavy Traffic", "Road Blocked", "Flooding", "Breakdown", "Construction"]
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  description: {
    type: String,
    default: "",
    trim: true
  },
  trafficLevel: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Low"
  },
  source: {
    type: String,
    enum: ["Google Maps", "Crowdsourcing", "History", "System"],
    default: "Crowdsourcing"
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Incident = mongoose.model("Incident", IncidentSchema);

const RouteSchema = new mongoose.Schema({
  startLocation: { type: String, required: true },
  endLocation: { type: String, required: true },
  startCoords: { lat: Number, lng: Number },
  endCoords: { lat: Number, lng: Number },
  distance: { type: String, default: "N/A" },
  estimatedTime: { type: String, default: "N/A" },
  trafficStatus: { type: String, enum: ["Clear", "Moderate", "Heavy"], default: "Clear" },
  alternateRoutes: [String],
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

const Route = mongoose.model("Route", RouteSchema);

const ChatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  message: { type: String, required: true },
  reply: { type: String, required: true },
  intent: { type: String, default: "general" }
}, { timestamps: true });

const Chat = mongoose.model("Chat", ChatSchema);

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided ❌" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token ❌" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access only 🔒" });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      req.user = jwt.verify(token, JWT_SECRET);
    }
  } catch (_) {}
  next();
};

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email & password required ❌" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters ❌" });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered ❌" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "user"
    });
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(201).json({
      success: true,
      message: "User registered successfully 🎉",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email & password required ❌" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials ❌" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials ❌" });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      success: true,
      message: "Login successful 🚀",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found ❌" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.put("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { name, password } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password too short ❌" });
      }
      updates.password = await bcrypt.hash(password, 12);
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
    res.json({ success: true, message: "Profile updated ✅", user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.post("/api/incidents", optionalAuth, async (req, res) => {
  try {
    const { type, location, coordinates, description, source } = req.body;
    if (!type || !location) {
      return res.status(400).json({ success: false, message: "Type & Location required ❌" });
    }
    let trafficLevel = "Low";
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await Incident.countDocuments({
        location,
        isActive: true,
        createdAt: { $gte: oneDayAgo }
      });
      if (count > 5) trafficLevel = "High";
      else if (count > 2) trafficLevel = "Medium";
    } catch (_) {
      console.log("DB not available, skipping traffic calculation");
    }
    const incident = await Incident.create({
      type,
      location,
      coordinates,
      description,
      trafficLevel,
      source: source || "Crowdsourcing",
      reportedBy: req.user?.id || null
    });
    res.status(201).json({
      success: true,
      message: "Incident reported 🚨",
      data: incident
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.get("/api/incidents", optionalAuth, async (req, res) => {
  try {
    const { type, location, trafficLevel, source, isActive, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (location) filter.location = new RegExp(location, "i");
    if (trafficLevel) filter.trafficLevel = trafficLevel;
    if (source) filter.source = source;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Incident.countDocuments(filter);
    const data = await Incident.find(filter)
      .populate("reportedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.json({
      success: true,
      count: data.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching incidents ❌" });
  }
});

app.get("/api/incidents/:id", async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate("reportedBy", "name email");
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found ❌" });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.put("/api/incidents/:id", authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found ❌" });
    const isOwner = incident.reportedBy?.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized ❌" });
    }
    const updated = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: "Incident updated ✅", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.delete("/api/incidents/:id", authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found ❌" });
    const isOwner = incident.reportedBy?.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized ❌" });
    }
    await Incident.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Incident deleted 🗑️" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.get("/api/traffic/heatmap", async (req, res) => {
  try {
    const pipeline = [
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 },
          highCount: { $sum: { $cond: [{ $eq: ["$trafficLevel", "High"] }, 1, 0] } },
          mediumCount: { $sum: { $cond: [{ $eq: ["$trafficLevel", "Medium"] }, 1, 0] } },
          lowCount: { $sum: { $cond: [{ $eq: ["$trafficLevel", "Low"] }, 1, 0] } },
          avgLat: { $avg: "$coordinates.lat" },
          avgLng: { $avg: "$coordinates.lng" },
          lastIncident: { $max: "$createdAt" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 100 }
    ];
    const data = await Incident.aggregate(pipeline);
    const heatmap = data.map(d => ({
      location: d._id,
      totalCount: d.count,
      highCount: d.highCount,
      mediumCount: d.mediumCount,
      lowCount: d.lowCount,
      coordinates: { lat: d.avgLat, lng: d.avgLng },
      intensity: d.count > 10 ? "Critical" : d.count > 5 ? "High" : d.count > 2 ? "Medium" : "Low",
      lastIncident: d.lastIncident
    }));
    res.json({ success: true, count: heatmap.length, data: heatmap });
  } catch (err) {
    res.status(500).json({ success: false, message: "Heatmap error ❌" });
  }
});

app.get("/api/traffic/predict", async (req, res) => {
  try {
    const { location, hour } = req.query;
    const targetHour = parseInt(hour) || new Date().getHours();
    const isPeakHour = (targetHour >= 8 && targetHour <= 10) || (targetHour >= 17 && targetHour <= 20);
    const isOffPeak = targetHour >= 1 && targetHour <= 6;
    let historicalCount = 0;
    let prediction = "Moderate";
    if (location) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - 30);
      const incidents = await Incident.find({
        location: new RegExp(location, "i"),
        createdAt: { $gte: dayStart }
      }).select("createdAt trafficLevel");
      historicalCount = incidents.filter(inc => {
        const incHour = new Date(inc.createdAt).getHours();
        return Math.abs(incHour - targetHour) <= 1;
      }).length;
    }
    if (historicalCount > 10 || isPeakHour) prediction = "Heavy";
    else if (historicalCount > 4) prediction = "Moderate";
    else if (isOffPeak || historicalCount === 0) prediction = "Light";
    const peakTimes = ["8:00 AM - 10:00 AM", "5:00 PM - 8:00 PM"];
    const tips = {
      Heavy: "🔴 Avoid if possible. Use alternate routes or travel off-peak.",
      Moderate: "🟡 Expect delays. Leave 15–20 min early.",
      Light: "🟢 Good time to travel. Roads are clear."
    };
    res.json({
      success: true,
      data: {
        location: location || "All locations",
        hour: `${targetHour}:00`,
        prediction,
        confidence: historicalCount > 5 ? "High" : historicalCount > 2 ? "Medium" : "Low",
        historicalCount,
        isPeakHour,
        peakTimes,
        tip: tips[prediction],
        nextBestTime: isPeakHour ? "After 9:00 PM" : "Current time is good ✅"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Prediction error ❌" });
  }
});

app.post("/api/routes/suggest", authMiddleware, async (req, res) => {
  try {
    const { startLocation, endLocation, startCoords, endCoords } = req.body;
    if (!startLocation || !endLocation) {
      return res.status(400).json({ success: false, message: "Start & end location required ❌" });
    }
    const startIncidents = await Incident.find({
      location: new RegExp(startLocation, "i"),
      isActive: true,
      trafficLevel: { $in: ["High", "Medium"] }
    }).countDocuments();
    const endIncidents = await Incident.find({
      location: new RegExp(endLocation, "i"),
      isActive: true,
      trafficLevel: { $in: ["High", "Medium"] }
    }).countDocuments();
    const totalBlockages = startIncidents + endIncidents;
    let trafficStatus = "Clear";
    let estimatedDelay = "No delay";
    let recommendation = "✅ Route looks clear! Proceed normally.";
    const alternateRoutes = [];
    if (totalBlockages > 5) {
      trafficStatus = "Heavy";
      estimatedDelay = "30–45 min extra";
      recommendation = "🔴 Heavy traffic on this route. Consider an alternate path.";
      alternateRoutes.push(`Via Ring Road from ${startLocation}`, `Via NH-48 bypass`);
    } else if (totalBlockages > 2) {
      trafficStatus = "Moderate";
      estimatedDelay = "10–15 min extra";
      recommendation = "🟡 Moderate traffic. Leave early or take alternate.";
      alternateRoutes.push(`Via inner lane from ${startLocation}`);
    }
    const route = await Route.create({
      startLocation,
      endLocation,
      startCoords,
      endCoords,
      trafficStatus,
      estimatedTime: estimatedDelay,
      alternateRoutes,
      requestedBy: req.user.id
    });
    res.json({
      success: true,
      message: "Route analyzed 🗺️",
      data: {
        id: route._id,
        startLocation,
        endLocation,
        trafficStatus,
        estimatedDelay,
        recommendation,
        alternateRoutes,
        activeIncidents: totalBlockages
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Route error ❌" });
  }
});

app.get("/api/routes/history", authMiddleware, async (req, res) => {
  try {
    const routes = await Route.find({ requestedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, count: routes.length, data: routes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const alerts = await Incident.find({
      isActive: true,
      $or: [
        { trafficLevel: "High" },
        { type: { $in: ["Accident", "Road Block"] } },
        { createdAt: { $gte: oneHourAgo } }
      ]
    })
      .populate("reportedBy", "name")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({
      success: true,
      count: alerts.length,
      message: alerts.length > 0 ? `⚠️ ${alerts.length} active alert(s)` : "✅ No active alerts",
      data: alerts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Alerts error ❌" });
  }
});

app.get("/api/traffic/peak-analysis", async (req, res) => {
  try {
    const { location } = req.query;
    const filter = { isActive: true };
    if (location) filter.location = new RegExp(location, "i");
    const incidents = await Incident.find(filter).select("createdAt trafficLevel type");
    const hourBuckets = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h}:00`,
      count: 0,
      highCount: 0,
      isPeak: (h >= 8 && h <= 10) || (h >= 17 && h <= 20)
    }));
    incidents.forEach(inc => {
      const h = new Date(inc.createdAt).getHours();
      hourBuckets[h].count++;
      if (inc.trafficLevel === "High") hourBuckets[h].highCount++;
    });
    const busiest = [...hourBuckets].sort((a, b) => b.count - a.count).slice(0, 3);
    const quietest = [...hourBuckets].sort((a, b) => a.count - b.count).slice(0, 3);
    res.json({
      success: true,
      data: {
        location: location || "All",
        hourlyData: hourBuckets,
        busiestHours: busiest.map(h => h.label),
        quietestHours: quietest.map(h => h.label),
        totalIncidents: incidents.length,
        peakHours: ["8:00 AM - 10:00 AM", "5:00 PM - 8:00 PM"],
        recommendation: "🕐 Best travel windows: 11 AM – 4 PM or after 9 PM"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Peak analysis error ❌" });
  }
});

app.post("/api/chat", optionalAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Message required ❌" });
    }
    const msg = message.toLowerCase().trim();
    let reply = "🤖 I'm Smart Traffic Bot! Ask me about traffic, accidents, routes, or peak hours.";
    let intent = "general";
    if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      reply = "👋 Hello! I'm your Smart Traffic Assistant. I can help with:\n• 🚦 Traffic conditions\n• ⚠️ Accident reports\n• 🗺️ Route suggestions\n• 📊 Peak time analysis";
      intent = "greeting";
    }
    else if (msg.includes("traffic") && msg.includes("heavy")) {
      reply = "🔴 Heavy traffic reported in multiple zones. Check the heatmap for live details. Peak hours are 8-10 AM and 5-8 PM.";
      intent = "traffic_heavy";
    }
    else if (msg.includes("traffic")) {
      let liveCount = 0;
      try {
        liveCount = await Incident.countDocuments({ trafficLevel: { $in: ["High", "Medium"] }, isActive: true });
      } catch (_) {}
      reply = `🚦 Currently ${liveCount} active traffic disruptions. ${liveCount > 5 ? "Roads are busy — plan ahead!" : "Traffic seems manageable right now."}`;
      intent = "traffic_general";
    }
    else if (msg.includes("accident")) {
      let accidentCount = 0;
      try {
        accidentCount = await Incident.countDocuments({ type: "Accident", isActive: true });
      } catch (_) {}
      reply = `⚠️ ${accidentCount} accident(s) currently reported. Drive carefully and follow traffic officers' instructions.`;
      intent = "accident";
    }
    else if (msg.includes("route") || msg.includes("way") || msg.includes("path") || msg.includes("navigate")) {
      reply = "🗺️ Use the Route Suggestion feature! Enter your start and destination to get the best path with live traffic data.";
      intent = "route";
    }
    else if (msg.includes("peak") || msg.includes("rush") || msg.includes("busy hour")) {
      reply = "⏰ Peak hours are:\n• Morning Rush: 8:00 AM – 10:00 AM\n• Evening Rush: 5:00 PM – 8:00 PM\nBest travel time: 11 AM–4 PM or after 9 PM 🟢";
      intent = "peak_hours";
    }
    else if (msg.includes("heatmap") || msg.includes("heat map") || msg.includes("hotspot")) {
      reply = "🗺️ The Traffic Heatmap shows congestion hotspots across the city. Red zones = high incidents, Green = clear. Check the map tab!";
      intent = "heatmap";
    }
    else if (msg.includes("predict") || msg.includes("forecast") || msg.includes("tomorrow")) {
      reply = "📈 Our AI predicts traffic based on historical patterns. Use the Prediction feature and enter your location + time for a forecast.";
      intent = "prediction";
    }
    else if (msg.includes("report") || msg.includes("add incident") || msg.includes("block")) {
      reply = "📍 You can report an incident from the Incidents section! Select type (Accident, Jam, Block), add location and description. Login required.";
      intent = "report";
    }
    else if (msg.includes("help") || msg.includes("what can you")) {
      reply = "🤖 I can help you with:\n1. 🚦 Live traffic conditions\n2. ⚠️ Accident alerts\n3. 🗺️ Route suggestions\n4. 📊 Peak time analysis\n5. 🔥 Traffic heatmap info\n6. 📈 Traffic predictions\n\nJust ask!";
      intent = "help";
    }
    try {
      await Chat.create({
        user: req.user?.id || null,
        message,
        reply,
        intent
      });
    } catch (_) {}
    res.json({ success: true, reply, intent });
  } catch (err) {
    res.status(500).json({ success: false, message: "Chatbot error ❌" });
  }
});

app.get("/api/chat/history", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: chats.length, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [
      totalUsers,
      totalIncidents,
      activeIncidents,
      highTrafficZones,
      totalRoutes,
      totalChats
    ] = await Promise.all([
      User.countDocuments(),
      Incident.countDocuments(),
      Incident.countDocuments({ isActive: true }),
      Incident.countDocuments({ trafficLevel: "High", isActive: true }),
      Route.countDocuments(),
      Chat.countDocuments()
    ]);
    const typeBreakdown = await Incident.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trend = await Incident.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json({
      success: true,
      data: {
        totalUsers,
        totalIncidents,
        activeIncidents,
        highTrafficZones,
        totalRoutes,
        totalChats,
        typeBreakdown,
        incidentTrend: trend
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Stats error ❌" });
  }
});

app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot delete yourself ❌" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted 🗑️" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

// ── ORS Proxy — keeps the API key server-side ─────────────────────────────
app.post("/api/ors/routes", async (req, res) => {
  const ORS_KEY = process.env.ORS_API_KEY;
  if (!ORS_KEY) {
    return res.status(503).json({ success: false, message: "ORS API key not configured on server ❌" });
  }
  try {
    const { start, end } = req.body;
    if (!start || !end || start.length !== 2 || end.length !== 2) {
      return res.status(400).json({ success: false, message: "start and end coordinates ([lng, lat]) required ❌" });
    }
    const orsRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ORS_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json, application/geo+json",
      },
      body: JSON.stringify({
        coordinates: [start, end],
        alternative_routes: {
          target_count: 2,
          weight_factor: 1.6,
          share_factor: 0.6,
        },
        instructions: false,
      }),
    });
    const data = await orsRes.json();
    if (!orsRes.ok) {
      return res.status(orsRes.status).json({ success: false, message: data.error?.message || "ORS request failed" });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("ORS proxy error:", err.message);
    res.status(500).json({ success: false, message: "ORS proxy error ❌" });
  }
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Smart Traffic Management API",
    version: "2.0.0",
    features: [
      "JWT Authentication",
      "Incident Reporting (Crowdsourcing)",
      "Traffic Heatmap",
      "Traffic Prediction (ML-style)",
      "Smart Route Suggestion",
      "Accident Alerts",
      "Peak Time Analysis",
      "AI Chatbot"
    ],
    routes: {
      auth: ["POST /api/auth/register", "POST /api/auth/login", "GET /api/auth/me"],
      incidents: ["GET /api/incidents", "POST /api/incidents", "PUT /api/incidents/:id", "DELETE /api/incidents/:id"],
      traffic: ["GET /api/traffic/heatmap", "GET /api/traffic/predict", "GET /api/traffic/peak-analysis"],
      routes: ["POST /api/routes/suggest", "GET /api/routes/history"],
      alerts: ["GET /api/alerts"],
      chat: ["POST /api/chat", "GET /api/chat/history"],
      admin: ["GET /api/admin/stats", "GET /api/admin/users"]
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    db: mongoose.connection.readyState === 1 ? "connected ✅" : "disconnected ❌",
    uptime: `${Math.floor(process.uptime())}s`
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found ❌" });
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(500).json({ success: false, message: "Something went wrong ❌" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Smart Traffic API running at http://localhost:${PORT}`);
  console.log(`📋 Endpoints: http://localhost:${PORT}/\n`);
});