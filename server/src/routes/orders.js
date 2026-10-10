const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const router = express.Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const orders = await Order.find().sort({ orderedAt: -1 }).limit(limit).lean();
    res.json(orders);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { customerName, customerEmail = "", items } = req.body;
    if (!String(customerName || "").trim() || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Customer name and at least one order item are required." });
    }
    const normalized = [];
    let total = 0;
    await session.withTransaction(async () => {
      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!mongoose.isValidObjectId(item.productId) || !Number.isInteger(quantity) || quantity < 1) {
          throw Object.assign(new Error("Each item needs a valid product and positive whole-number quantity."), { status: 400 });
        }
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session }
        );
        if (!product) throw Object.assign(new Error("Product not found or insufficient stock."), { status: 400 });
        const lineTotal = Number((product.price * quantity).toFixed(2));
        total += lineTotal;
        normalized.push({ product: product._id, productName: product.name, quantity, unitPrice: product.price, lineTotal });
      }
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
      const [created] = await Order.create([{
        orderNumber, customerName: String(customerName).trim(),
        customerEmail: String(customerEmail).trim().toLowerCase(),
        items: normalized, total: Number(total.toFixed(2)), status: "Completed", orderedAt: new Date()
      }], { session });
      req.createdOrder = created.toObject();
    });
    const io = req.app.get("io");
    io.emit("order:created", { orderId: req.createdOrder._id });
    io.emit("analytics:refresh", { reason: "order-created" });
    io.emit("product:updated", { reason: "stock-changed" });
    res.status(201).json(req.createdOrder);
  } catch (e) { next(e); }
  finally { await session.endSession(); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const allowed = ["Pending", "Processing", "Completed", "Cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: "Order not found." });
    req.app.get("io").emit("order:updated", { orderId: order._id });
    req.app.get("io").emit("analytics:refresh", { reason: "order-status-changed" });
    res.json(order);
  } catch (e) { next(e); }
});

module.exports = router;
