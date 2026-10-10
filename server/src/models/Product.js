const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
