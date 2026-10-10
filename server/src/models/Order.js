const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  customerEmail: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
  items: { type: [orderItemSchema], validate: v => v.length > 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Pending", "Processing", "Completed", "Cancelled"], default: "Completed" },
  orderedAt: { type: Date, default: Date.now }
}, { timestamps: true });

orderSchema.index({ orderedAt: -1 });
module.exports = mongoose.model("Order", orderSchema);
