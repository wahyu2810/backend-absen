const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const absensiRoutes = require("./routes/absensi");

const app = express();

/* ================================
   Middleware
================================ */
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ================================
   Routes
================================ */
app.use("/api/auth", authRoutes);
app.use("/api/absensi", absensiRoutes);

/* ================================
   Test endpoint
================================ */
app.get("/", (req, res) => {
  res.send("API Absensi Magang Aktif");
});

app.get("/api", (req, res) => {
  res.send("API aktif");
});

/* ================================
   Jalankan server
================================ */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
