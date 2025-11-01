// /server/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
router.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES = "7d";

const sign = (user) =>
  jwt.sign(
    { id: String(user._id), role: user.role, isAdmin: !!user.isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

// POST /api/auth/signup  { name?, email, password, role? }
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email_password_required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "email_exists" });

    const user = new User({
      name: name || (email.split("@")[0] || ""),
      email,
      password,
      role: role || "student",
    });
    await user.save();

    const token = sign(user);
    res.json({ ok: true, token, user: user.summary() });
  } catch (e) {
    console.error("signup error:", e);
    res.status(500).json({ error: "signup_failed" });
  }
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email_password_required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    user.lastLogin = new Date();
    await user.save();

    const token = sign(user);
    res.json({ ok: true, token, user: user.summary() });
  } catch (e) {
    console.error("login error:", e);
    res.status(500).json({ error: "login_failed" });
  }
});

// GET /api/auth/me   (Authorization: Bearer <token>)
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "no_token" });

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "invalid_token" });

    res.json({ ok: true, user: user.summary() });
  } catch (e) {
    console.error("me error:", e);
    res.status(401).json({ error: "auth_failed" });
  }
});

export default router;
