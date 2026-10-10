const express = require("express");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const router = express.Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try { res.json(await Product.find().sort({ createdAt: -1 }).lean()); } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, category, price, stock, sku } = req.body;
    if (!name || !category || !sku || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ message: "Provide name, category, SKU, a non-negative price and whole-number stock." });
    }
    const product = await Product.create({ name, category, price: Number(price), stock: Number(stock), sku });
    const io = req.app.get("io");
    io.emit("product:updated", { id: product._id });
    res.status(201).json(product);
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: "SKU already exists." }); next(e); }
});

router.patch("/:id/stock", async (req, res, next) => {
  try {
    const stock = Number(req.body.stock);
    if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ message: "Stock must be a non-negative whole number." });
    const product = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    req.app.get("io").emit("product:updated", { id: product._id });
    res.json(product);
  } catch (e) { next(e); }
});

module.exports = router;
