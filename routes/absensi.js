const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

/* ================================
   Fungsi hitung jarak (Haversine)
================================ */
function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ================================
   Koordinat kantor Bawaslu
================================ */
const KANTOR_LAT = -6.488964;
const KANTOR_LON = 106.729858;
const MAX_JARAK = 100; // meter

/* ================================
   Absen Masuk (status otomatis)
================================ */
router.post("/masuk", auth, async (req, res) => {
  try {
    const { latitude, longitude, foto } = req.body;
    const userId = req.user.id;

    const jarak = hitungJarak(
      latitude,
      longitude,
      KANTOR_LAT,
      KANTOR_LON
    );

    if (jarak > MAX_JARAK) {
      return res.status(403).json({ msg: "Di luar area kantor" });
    }

    const now = new Date();

    // Hitung menit dari jam sekarang
    const jam = now.getHours();
    const menit = now.getMinutes();
    const totalMenit = jam * 60 + menit;

    const batasMasuk = 8 * 60; // 08:00 = 480 menit

    let status = "hadir";
    if (totalMenit > batasMasuk) {
      status = "terlambat";
    }

    const today = now.toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO absensi
       (user_id, tanggal, jam_masuk, foto_masuk, latitude, longitude, status)
       VALUES ($1, $2, CURRENT_TIME, $3, $4, $5, $6)
       ON CONFLICT (user_id, tanggal)
       DO UPDATE
       SET jam_masuk = CURRENT_TIME,
           status = $6`,
      [userId, today, foto, latitude, longitude, status]
    );

    res.json({
      msg: "Absen masuk berhasil",
      status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   Absen Pulang
================================ */
router.post("/pulang", auth, async (req, res) => {
  try {
    const { foto } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    await pool.query(
      `UPDATE absensi
       SET jam_pulang = CURRENT_TIME,
           foto_pulang = $1
       WHERE user_id = $2
       AND tanggal = $3`,
      [foto, userId, today]
    );

    res.json({ msg: "Absen pulang berhasil" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   Status hari ini (untuk dashboard)
================================ */
router.get("/hari-ini", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT tanggal, jam_masuk, jam_pulang, status
       FROM absensi
       WHERE user_id = $1 AND tanggal = $2`,
      [userId, today]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: "belum absen",
        jam_masuk: null,
        jam_pulang: null,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   Riwayat Absensi Peserta
================================ */
router.get("/riwayat", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tanggal, jam_masuk, jam_pulang, status
       FROM absensi
       WHERE user_id = $1
       ORDER BY tanggal DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   Rekap Absensi Admin
================================ */
router.get("/admin/rekap", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Akses ditolak" });
    }

    const result = await pool.query(`
      SELECT
        u.nama,
        a.tanggal,
        a.jam_masuk,
        a.jam_pulang,
        a.status
      FROM absensi a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.tanggal DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
