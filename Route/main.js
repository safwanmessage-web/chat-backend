const express = require("express");
const router = express.Router();

// الصفحة الرئيسية
router.get("/", (req, res) => {
  res.json({ message: "Welcome to the Home Page" });
});

// صفحة About كمثال GET آخر
router.get("/about", (req, res) => {
  res.json({
    message: "This is the About Page",
    info: "Project example with GET routes"
  });
});

module.exports = router;
