require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const cluster = require("cluster");
const os = require("os");

const numCPUs = os.cpus().length;

// ---------- CLUSTER MODE ----------
if (cluster.isPrimary) {
  console.log(`🧵 Primary process started (PID: ${process.pid})`);
  console.log(`🚀 Starting ${numCPUs} worker processes...`);

  // Create workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart worker if it crashes
  cluster.on("exit", (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  // ---------- WORKER PROCESSES ----------
  const authRoutes = require("./routes/auth");
  const productRoutes = require("./routes/products");
  const dashboardRoutes = require("./routes/dashboard");
  const retailerRoutes = require("./routes/retailer");
  const orderRoutes = require("./routes/orders");
  const invoiceRoutes = require("./routes/invoices");
  const reportRoutes = require("./routes/reports");
  const settingsRoutes = require("./routes/settings");
  const paymentRoutes = require("./routes/payments");

  const app = express();
  app.use(cors());

  app.use("/api/payments/webhook", paymentRoutes);

  app.use(express.json());
  app.use(morgan("dev"));

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/retailerDashboard", retailerRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/payments", paymentRoutes);

  app.get("/", (req, res) =>
    res.json({ ok: true, msg: "B2B Wholesale Portal API" })
  );

  const PORT = process.env.PORT || 4000;

  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log(`📦 Worker ${process.pid} connected to MongoDB`);
      app.listen(PORT, () =>
        console.log(`Worker ${process.pid} running on port ${PORT}`)
      );
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    });
}
