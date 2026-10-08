# 🗄️ LUXE HAUS - Salon Management REST API Backend

Production-ready MERN Stack Express + MongoDB REST API backend for Luxe Haus Multi-Branch Salon Management Ecosystem.

## 🚀 How to Run Backend Standalone

```bash
cd backend
npm install
npm run dev
```

The Express API server starts at `http://localhost:5000`.

## ⚙️ Environment Configuration (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/luxe_salon_db
JWT_SECRET=luxe_secret_key_8801_production
FRONTEND_URL=http://localhost:3000
```

## 📡 Key REST API Endpoints

### Auth Routes (`/api/auth`)
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `GET /api/auth/me` - Get current user profile (JWT protected)

### Branch Routes (`/api/branches`)
- `GET /api/branches` - List all salon branches
- `POST /api/branches` - Head Admin register new branch
- `PATCH /api/branches/:id/toggle-status` - Head Admin activate/deactivate branch
- `PUT /api/branches/:id/settings` - Branch Admin update timings, chairs, address
- `GET /api/branches/:id/stats` - Get branch revenue & today's occupancy metrics

### Service Catalog Routes (`/api/services`)
- `GET /api/services` - List services (filter by branch or category)
- `POST /api/services` - Head Admin add new service
- `GET /api/services/categories` - List categories
- `POST /api/services/categories` - Head Admin create category

### Coupon & Promo Routes (`/api/coupons`)
- `GET /api/coupons` - List coupons
- `POST /api/coupons` - Head Admin create promo code
- `POST /api/coupons/validate` - Validate code at checkout and calculate discount

### Appointment Routes (`/api/appointments`)
- `POST /api/appointments` - Create new reservation pass
- `GET /api/appointments/branch/:branchId` - Branch Admin list appointments
- `GET /api/appointments/my` - Customer personal bookings
- `PATCH /api/appointments/:id/status` - Update status (`confirmed`, `in-progress`, `completed`, `cancelled`)
- `PATCH /api/appointments/:id/reschedule` - Reschedule appointment slot
