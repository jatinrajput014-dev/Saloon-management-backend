const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    description: { type: String, required: true },
    duration: { type: Number, required: true }, // in minutes
    price: { type: Number, required: true }, // in USD
    popular: { type: Boolean, default: false },
    image: { type: String, default: '' },
    branches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
      }
    ],
    availableAtAllBranches: { type: Boolean, default: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
