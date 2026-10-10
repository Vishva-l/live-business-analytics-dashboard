const dns = require("node:dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const analyticsRoutes = require("./routes/analytics");
const demoRoutes = require("./routes/demo");
const auth = require("./middleware/auth");

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST", "PATCH"] }
});
app.set("io", io);
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "live-business-analytics-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/demo", demoRoutes);

io.on("connection", socket => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`Socket disconnected: ${socket.id}`));
});

// Last-resort error handler; don't expose stack traces in API responses.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Server error. Check server logs." });
});

const port = Number(process.env.PORT) || 5000;
connectDB().then(() => server.listen(port, () => console.log(`API + Socket.IO listening on http://localhost:${port}`)))
  .catch(err => { console.error("Startup failed:", err.message); process.exit(1); });
