// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve your HTML files (index.html and admin.html)
app.use(express.static(path.join(__dirname, './')));

// --- 1. DATABASE SETUP ---
const MONGO_URI = process.env.MONGO_URI || "YOUR_MONGODB_CONNECTION_STRING";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Connection Error:", err));

// Database Schemas
const Payment = mongoose.model('Payment', new mongoose.Schema({
    name: String, grade: String, amount: Number, mpesa: String, date: { type: Date, default: Date.now }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    grade: String, age: Number, date: String, fileName: String, dateBooked: { type: Date, default: Date.now }
}));

const Announcement = mongoose.model('Announcement', new mongoose.Schema({
    title: String, message: String, date: { type: Date, default: Date.now }
}));

// --- 2. EMAIL SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

function sendEmail(subject, text) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'muriungimickeymickey@gmail.com',
        subject: subject,
        text: text
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.log("Email Error:", err);
        else console.log("Email Sent:", info.response);
    });
}

// --- 3. PUBLIC API ROUTES (For Parents) ---
app.post('/api/pay', async (req, res) => {
    const { name, grade, amount, mpesa } = req.body;
    const newPayment = new Payment({ name, grade, amount, mpesa });
    await newPayment.save();
    sendEmail("New Fee Payment Received", `Parent: ${name}\nGrade: ${grade}\nAmount: KSh ${amount}\nM-Pesa: ${mpesa}`);
    res.json({ success: true, message: "Payment recorded" });
});

app.post('/api/book', async (req, res) => {
    const { grade, age, date, fileName } = req.body;
    const newBooking = new Booking({ grade, age, date, fileName });
    await newBooking.save();
    sendEmail("New Interview Booking", `Grade: ${grade}\nAge: ${age}\nDate: ${date}\nFile: ${fileName}`);
    res.json({ success: true, message: "Booking recorded" });
});

app.get('/api/announcements', async (req, res) => {
    const announcements = await Announcement.find().sort({ date: -1 });
    res.json(announcements);
});

// --- 4. ADMIN LOGIN & AUTHENTICATION ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Mickey@377";

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    console.log("Login attempt. Password entered:", password);
    
    if (password !== ADMIN_PASSWORD) {
        console.log("Password mismatch!");
        return res.status(401).json({ error: "Invalid password" });
    }
    
    console.log("Password correct! Login successful.");
    res.json({ success: true, message: "Login successful" });
});

const checkAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Access Denied" });
    }
    next();
};

// --- 5. ADMIN API ROUTES (Protected) ---
app.get('/api/admin/payments', checkAdmin, async (req, res) => {
    const payments = await Payment.find().sort({ date: -1 });
    res.json(payments);
});

app.get('/api/admin/bookings', checkAdmin, async (req, res) => {
    const bookings = await Booking.find().sort({ date: -1 });
    res.json(bookings);
});

app.post('/api/admin/announcement', checkAdmin, async (req, res) => {
    const { title, message } = req.body;
    const newAnn = new Announcement({ title, message });
    await newAnn.save();
    res.json({ success: true });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));