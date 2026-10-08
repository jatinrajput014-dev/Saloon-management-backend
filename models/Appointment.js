const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentCode: { type: String, unique: true, required: true },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String, required: true },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
      }
    ],
    stylist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    stylistName: { type: String, default: 'Any Available Specialist' },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    timeSlot: { type: String, required: true }, // 'HH:MM'
    duration: { type: Number, default: 60 },
    chairNumber: { type: String, default: 'Chair 01' },
    subtotal: { type: Number, required: true },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null
    },
    couponCode: { type: String, default: null },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      default: 'Pay at Salon'
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'refunded'],
      default: 'paid'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'rescheduled', 'cancelled', 'completed'],
      default: 'pending'
    },
    notes: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: null }
  },
  { timestamps: true }
);

AppointmentSchema.methods.canCancelOrReschedule = function() {
  if (!this.date || !this.timeSlot) return true;
  try {
    const timeParts = this.timeSlot.split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    
    const [year, month, day] = this.date.split('-').map(num => parseInt(num, 10));
    const appointmentDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    
    const diffInMs = appointmentDate.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    // Prohibited if appointment is past or less than 2 hours away
    return diffInHours >= 2;
  } catch (err) {
    return true;
  }
};

module.exports = mongoose.model('Appointment', AppointmentSchema);
