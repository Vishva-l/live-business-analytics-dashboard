const express = require("express");
const auth = require("../middleware/auth");
const Product = require("../models/Product");
const Order = require("../models/Order");
const router = express.Router();
router.use(auth);

router.post("/seed", async (req, res, next) => {
  try {
    if (process.env.DEMO_MODE_ENABLED !== "true") return res.status(403).json({ message: "Demo mode is disabled." });
    const existing = await Product.countDocuments();
    if (existing > 0) return res.status(409).json({ message: "Products already exist. Clear the database before seeding again." });
    const products = await Product.insertMany([
      { name: "Wireless Headphones", category: "Electronics", price: 2499, stock: 35, sku: "ELEC-001" },
      { name: "Smart Watch", category: "Electronics", price: 3999, stock: 22, sku: "ELEC-002" },
      { name: "Travel Backpack", category: "Accessories", price: 1499, stock: 18, sku: "ACC-001" },
      { name: "Cotton T-Shirt", category: "Fashion", price: 699, stock: 60, sku: "FASH-001" },
      { name: "Desk Lamp", category: "Home", price: 1199, stock: 4, sku: "HOME-001" },
      { name: "Water Bottle", category: "Home", price: 399, stock: 3, sku: "HOME-002" }
    ]);
    const names = ["Aarav Patel","Diya Shah","Rohan Mehta","Anaya Joshi","Vivaan Desai","Isha Trivedi","Kabir Parmar","Mira Dave"];
    const emails = ["aarav@example.com","diya@example.com","rohan@example.com","anaya@example.com","vivaan@example.com","isha@example.com","kabir@example.com","mira@example.com"];
    const docs = [];
    for (let i = 0; i < 28; i++) {
      const p = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      docs.push({
        orderNumber: `DEMO-${Date.now()}-${i}-${Math.floor(Math.random()*1000)}`,
        customerName: names[i % names.length], customerEmail: emails[i % emails.length],
        items: [{ product: p._id, productName: p.name, quantity: qty, unitPrice: p.price, lineTotal: p.price * qty }],
        total: p.price * qty, status: ["Completed","Completed","Processing","Pending"][Math.floor(Math.random()*4)],
        orderedAt: new Date(Date.now() - Math.random() * 29 * 86400000)
      });
    }
    await Order.insertMany(docs);
    req.app.get("io").emit("analytics:refresh", { reason: "demo-seeded" });
    res.status(201).json({ message: "Demo data created.", products: products.length, orders: docs.length });
  } catch (e) { next(e); }
});

router.post("/order", async (req, res, next) => {
  try {
    if (process.env.DEMO_MODE_ENABLED !== "true") return res.status(403).json({ message: "Demo mode is disabled." });
    const products = await Product.find({ stock: { $gt: 0 } });
    if (!products.length) return res.status(400).json({ message: "No products have stock. Add stock first." });
    const product = products[Math.floor(Math.random() * products.length)];
    const qty = 1;
    product.stock -= qty;
    await product.save();
    const order = await Order.create({
      orderNumber: `LIVE-${Date.now()}`,
      customerName: ["Aarav Patel","Diya Shah","Rohan Mehta","Anaya Joshi"][Math.floor(Math.random()*4)],
      customerEmail: `customer${Math.floor(Math.random()*1000)}@example.com`,
      items: [{ product: product._id, productName: product.name, quantity: qty, unitPrice: product.price, lineTotal: product.price }],
      total: product.price, status: "Completed", orderedAt: new Date()
    });
    const io = req.app.get("io");
    io.emit("order:created", { orderId: order._id });
    io.emit("analytics:refresh", { reason: "demo-order" });
    io.emit("product:updated", { productId: product._id });
    res.status(201).json({ message: "A live demo order was created.", order });
  } catch (e) { next(e); }
});

module.exports = router;
