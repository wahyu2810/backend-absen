const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

/* ================================
   Register
================================ */
router.post("/register", async (req, res) => {
  try {
    const { nama, email, password } = req.body;

    // Validasi input
    if (!nama || !email || !password) {
      return res.status(400).json({
        error: "Nama, email, dan password wajib diisi",
      });
    }

    // Cek apakah email sudah terdaftar
    const check = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (check.rows.length > 0) {
      return res.status(409).json({
        error: "Email sudah terdaftar",
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Simpan ke database
    const result = await pool.query(
      `INSERT INTO users(nama,email,password)
       VALUES($1,$2,$3)
       RETURNING id,nama,email,role`,
      [nama, email, hash]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   Login
================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email dan password wajib diisi",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "User tidak ditemukan" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ msg: "Password salah" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   GET Semua Peserta (Admin)
================================ */
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nama, email, role FROM users ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
