const express = require("express");
const router = express.Router();

// صفحة المستخدم الرئيسية
router.get("/", (req, res) => {
  res.json({
    message: "Welcome to the User Page",
    commands: ["viewProfile", "viewMessages", "logout"]
  });
});

// صفحة الملف الشخصي
router.get("/profile", (req, res) => {
  res.json({
    profile: {
      name: "Ali",
      email: "ali@gmail.com",
      role: "User"
    }
  });
});

module.exports = Route;
