const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || password.length < 8) {
      return res.status(400).json({ message: "Name, valid email and password (at least 8 characters) are required." });
    }
    if (await User.findOne({ email })) return res.status(409).json({ message: "Email is already registered." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.get("/me", auth, (req, res) => res.json({ user: req.user }));

module.exports = router;
