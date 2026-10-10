const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const auth = require("../middleware/auth");
const router = express.Router();
router.use(auth);

function getRange(range) {
  const end = new Date();
  const start = new Date(end);
  if (range === "today") start.setHours(0, 0, 0, 0);
  else if (range === "7d") start.setDate(start.getDate() - 6);
  else if (range === "30d") start.setDate(start.getDate() - 29);
  else if (range === "12m") { start.setMonth(start.getMonth() - 11); start.setDate(1); start.setHours(0,0,0,0); }
  else { start.setDate(start.getDate() - 29); }
  return { start, end };
}

router.get("/overview", async (req, res, next) => {
  try {
    const { start, end } = getRange(String(req.query.range || "30d"));
    const match = { orderedAt: { $gte: start, $lte: end }, status: { $ne: "Cancelled" } };
    const [summaryRows, orderCount, customerCount, productCount, lowStock, salesRows, topProducts, recentOrders] = await Promise.all([
      Order.aggregate([{ $match: match }, { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 }, averageOrderValue: { $avg: "$total" } } }]),
      Order.countDocuments(match),
      Order.distinct("customerEmail", { customerEmail: { $ne: "" } }),
      Product.countDocuments(),
      Product.find({ stock: { $lte: 5 } }).sort({ stock: 1 }).limit(8).lean(),
      Order.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderedAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: match }, { $unwind: "$items" },
        { $group: { _id: "$items.productName", quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } },
        { $sort: { revenue: -1 } }, { $limit: 5 }
      ]),
      Order.find().sort({ orderedAt: -1 }).limit(8).lean()
    ]);
    const summary = summaryRows[0] || { revenue: 0, orders: 0, averageOrderValue: 0 };
    res.json({
      range: { start, end },
      kpis: {
        revenue: Number(summary.revenue || 0),
        orders: orderCount,
        customers: customerCount.length,
        products: productCount,
        averageOrderValue: Number(summary.averageOrderValue || 0)
      },
      sales: salesRows.map(r => ({ date: r._id, revenue: Number(r.revenue), orders: r.orders })),
      topProducts,
      lowStock,
      recentOrders
    });
  } catch (e) { next(e); }
});

router.get("/export.csv", async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ orderedAt: -1 }).limit(5000).lean();
    const quote = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Order Number","Customer","Email","Status","Total","Date"].join(",")];
    for (const o of orders) lines.push([o.orderNumber,o.customerName,o.customerEmail,o.status,o.total,new Date(o.orderedAt).toISOString()].map(quote).join(","));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=business-orders.csv");
    res.send(lines.join("\r\n"));
  } catch (e) { next(e); }
});

module.exports = router;
