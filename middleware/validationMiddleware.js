/**
 * Zod-style Express Validation Middleware for Luxe Haus Salon Backend
 */

const validateBranch = (body) => {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('Branch Name is required.');
  } else if (!/^[a-zA-Z\s]+$/.test(body.name.trim())) {
    errors.push('Branch Name must contain letters and spaces only.');
  }

  if (!body.phone && !body.contact) {
    errors.push('Phone number is required.');
  } else {
    const contact = (body.phone || body.contact || '').trim();
    if (contact.includes('-')) {
      errors.push('Phone number cannot be a negative number.');
    } else if (!/^\d{10}$/.test(contact)) {
      errors.push('Phone number must be a positive 10-digit numeric value (0-9 only).');
    }
  }

  if (body.adminLoginId || body.adminEmail) {
    const loginId = (body.adminLoginId || body.adminEmail || '').trim();
    if (!/^[a-zA-Z0-9._%+-]+@luxehaus\.in$/i.test(loginId)) {
      errors.push('Branch Admin ID must follow the domain format user@luxehaus.in (e.g., JR@luxehaus.in).');
    }
  }

  if (!body.address || typeof body.address !== 'string' || body.address.trim().length === 0) {
    errors.push('Branch Address is required.');
  } else if (!/[a-zA-Z]/.test(body.address.trim())) {
    errors.push('Branch Address cannot be purely numeric and must contain at least one alphabet letter.');
  } else if (!/^[a-zA-Z0-9\s,.\-#/]+$/.test(body.address.trim())) {
    errors.push('Branch Address must be alphanumeric and contain only standard punctuation (, . - # /).');
  }

  if (body.openingTime) {
    const is12Hr = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(body.openingTime.trim());
    const is24Hr = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.openingTime.trim());
    if (!is12Hr && !is24Hr) {
      errors.push('Opening Time must follow Indian time format (e.g., 09:00 AM or 08:00 PM).');
    }
  }

  if (body.closingTime) {
    const is12Hr = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(body.closingTime.trim());
    const is24Hr = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.closingTime.trim());
    if (!is12Hr && !is24Hr) {
      errors.push('Closing Time must follow Indian time format (e.g., 09:00 AM or 08:00 PM).');
    }
  }

  if (body.status && !['active', 'inactive', 'deactivated'].includes(body.status.toLowerCase())) {
    errors.push('Branch Status must be either "active" or "inactive".');
  }

  return errors;
};

const validateService = (body) => {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('Service Title is required.');
  } else if (!/^[a-zA-Z\s]+$/.test(body.name.trim())) {
    errors.push('Service Title must contain letters and spaces only.');
  }

  if (body.price === undefined || body.price === null || isNaN(body.price) || Number(body.price) <= 0) {
    errors.push('Service Price must be a positive number greater than 0.');
  }

  if (body.duration === undefined || body.duration === null || isNaN(body.duration) || Number(body.duration) <= 0) {
    errors.push('Service Estimated Duration must be a positive number in minutes.');
  }

  if (body.category && !/[a-zA-Z]/.test(body.category)) {
    errors.push('Category Name cannot be purely numeric.');
  }

  if (body.status && !['active', 'inactive'].includes(body.status.toLowerCase())) {
    errors.push('Service Status must be either "active" or "inactive".');
  }

  return errors;
};

const validateCoupon = (body) => {
  const errors = [];

  if (!body.code || typeof body.code !== 'string' || body.code.trim().length === 0) {
    errors.push('Coupon Code is required.');
  } else if (!/[a-zA-Z]/.test(body.code.trim())) {
    errors.push('Promo / Coupon Code must contain at least 1 letter (cannot be purely numeric).');
  }

  if (body.title) {
    if (!/^[a-zA-Z\s]+$/.test(body.title.trim())) {
      errors.push('Campaign Title must contain letters and spaces only.');
    }
  }

  if (body.discountValue === undefined || body.discountValue === null || isNaN(body.discountValue) || Number(body.discountValue) <= 0) {
    errors.push('Discount Value must be a positive number.');
  }

  if (body.usageLimit !== undefined && body.usageLimit !== null && (isNaN(body.usageLimit) || Number(body.usageLimit) < 1)) {
    errors.push('Coupon Usage Limit must be at least 1.');
  }

  return errors;
};

const validateCustomerRegister = (body) => {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('Customer Name is required.');
  } else if (!/[a-zA-Z]/.test(body.name)) {
    errors.push('Customer Name cannot be purely numeric.');
  }

  if (!body.phone) {
    errors.push('Phone number is required.');
  } else if (body.phone.trim().includes('-')) {
    errors.push('Phone number cannot be a negative number.');
  } else if (!/^\d{10}$/.test(body.phone.trim())) {
    errors.push('Phone number must be a positive 10-digit numeric value (0-9 only).');
  }

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.push('Valid Customer Email address is required.');
  }

  return errors;
};

const validateSchema = (type) => {
  return (req, res, next) => {
    let errors = [];
    if (type === 'branch') errors = validateBranch(req.body);
    else if (type === 'service') errors = validateService(req.body);
    else if (type === 'coupon') errors = validateCoupon(req.body);
    else if (type === 'customer') errors = validateCustomerRegister(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(' '),
        errors
      });
    }
    next();
  };
};

module.exports = {
  validateBranch,
  validateService,
  validateCoupon,
  validateCustomerRegister,
  validateSchema
};
