# Richard Fitness - Professional Gym Website

A complete, professional gym website with modern UI/UX design and comprehensive backend API. Built with Node.js, Express, MongoDB, and vanilla JavaScript.

## 🚀 Features

### Frontend
- **Modern, Professional Design**: Clean, photo-ready layout optimized for gym photography
- **Responsive Design**: Works perfectly on all devices and screen sizes
- **Dark/Light Theme**: Toggle between themes with smooth transitions
- **Interactive Elements**: Smooth scrolling, animations, and micro-interactions
- **Contact Forms**: Integrated with backend API for seamless communication
- **Membership Management**: Dynamic pricing display and signup forms

### Backend API
- **Complete REST API**: Full CRUD operations for all entities
- **User Authentication**: JWT-based auth with role-based permissions
- **Membership Management**: Plans, subscriptions, and billing integration
- **Class Booking System**: Schedule classes and manage bookings
- **Trainer Management**: Profiles, availability, and session booking
- **Contact System**: Form submissions with email notifications
- **Admin Dashboard**: Complete management interface
- **File Upload**: Profile images and media management
- **Email Integration**: Automated notifications and confirmations

### Database Models
- Users with profiles and preferences
- Membership plans and user subscriptions
- Trainers with availability and specializations
- Classes with schedules and bookings
- Contact inquiries with status tracking
- Comprehensive booking system

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Email**: Nodemailer with SMTP support
- **File Upload**: Multer with organized storage
- **Security**: Helmet, CORS, rate limiting
- **Frontend**: Vanilla JavaScript, Modern CSS Grid/Flexbox
- **Icons**: Font Awesome 6
- **Fonts**: Inter from Google Fonts

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- SMTP email service (Gmail, SendGrid, etc.)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd richard-fitness
   ```

2. **Install dependencies**
   ```bash
   npm run install-deps
   ```

3. **Environment Setup**
   ```bash
   cp .env.example backend/.env
   ```
   Edit `backend/.env` with your configuration:
   - MongoDB connection string
   - JWT secret key
   - Email SMTP settings
   - Admin credentials

4. **Seed the database (optional)**
   ```bash
   npm run seed
   ```
   This creates sample data including:
   - Admin user (admin@richardfitness.com / admin123)
   - Sample members and trainers
   - Membership plans
   - Classes and schedules

5. **Start the application**
   ```bash
   npm start
   ```
   
   For development:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Website: http://localhost:5000
   - API: http://localhost:5000/api
   - Health check: http://localhost:5000/api/health

## 🗂️ Project Structure

```
richard-fitness/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── app.js
│   ├── uploads/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── index.html
├── docs/
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile
- `PUT /api/auth/change-password` - Change password

### Membership
- `GET /api/membership/plans` - Get all plans
- `POST /api/membership/purchase` - Purchase membership
- `GET /api/membership/my-membership` - Get user's membership
- `POST /api/membership/cancel` - Cancel membership

### Classes
- `GET /api/classes` - Get all classes
- `GET /api/classes/:id` - Get single class
- `POST /api/classes/:id/book` - Book a class
- `GET /api/classes/my-bookings` - Get user bookings

### Trainers
- `GET /api/trainers` - Get all trainers
- `GET /api/trainers/:id` - Get single trainer
- `POST /api/trainers/:id/book` - Book personal training

### Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Get all contacts (admin)

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/settings` - System settings
- `GET /api/admin/health` - System health check

## 🎨 Customization

### Styling
The CSS uses a comprehensive design system with CSS custom properties. Key customization points:

- **Colors**: Update the color palette in `:root`
- **Typography**: Modify font families and sizes
- **Spacing**: Adjust the spacing scale
- **Components**: Each component is modular and easily customizable

### Content
- Update gym information in `frontend/index.html`
- Modify membership plans in the database
- Replace placeholder images with your gym photos
- Customize email templates in `backend/src/utils/email.js`

### Branding
- Replace "Richard Fitness" with your gym name
- Update logo and favicon
- Modify color scheme to match your brand
- Customize email templates and notifications

## 🚀 Deployment

### Environment Variables
Ensure all production environment variables are set:
- `NODE_ENV=production`
- `MONGODB_URI` (production database)
- `JWT_SECRET` (strong, unique secret)
- Email configuration
- Domain settings

### Recommended Hosting
- **Backend**: Heroku, Railway, DigitalOcean App Platform
- **Database**: MongoDB Atlas
- **Static Files**: AWS S3, Cloudinary
- **Email**: SendGrid, Mailgun, Amazon SES

### Production Checklist
- [ ] Set strong JWT secret
- [ ] Configure production database
- [ ] Set up email service
- [ ] Enable HTTPS
- [ ] Configure CORS for your domain
- [ ] Set up file upload storage
- [ ] Configure monitoring and logging
- [ ] Set up automated backups

## 🔒 Security Features

- **Authentication**: JWT tokens with secure password hashing
- **Authorization**: Role-based access control
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive data validation
- **File Upload Security**: Type and size restrictions
- **CORS Protection**: Configurable cross-origin policies
- **Helmet**: Security headers for web vulnerabilities

## 📧 Email Templates

The system includes professional email templates for:
- Welcome messages
- Booking confirmations
- Membership notifications
- Contact form responses
- Password reset (ready for implementation)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API endpoints
- Examine the sample data structure
- Test with the provided seed data

## 🎯 Future Enhancements

- Payment gateway integration (Stripe, PayPal)
- Mobile app API support
- Advanced reporting and analytics
- Social media integration
- Workout tracking features
- Nutrition planning tools
- Member check-in system
- Equipment booking system

---

**Built with ❤️ for the fitness community**