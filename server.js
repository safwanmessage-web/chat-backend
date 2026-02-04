const express = require('express');
const mysql = require('mysql2');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs'); 
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const caCert = fs.readFileSync(path.join(__dirname, 'ca.pem'));
// 1. إعداد الاتصال بقاعدة البيانات
// تأكد من بيانات Wampserver هنا
const db = mysql.createPool({
    host: 'mysql-2f32d514-safwanmessage-4848.g.aivencloud.com', // المضيف من صورتك
    port: 10278, // المنفذ من صورتك
    user: 'avnadmin', // المستخدم من صورتك
    password: 'AVNS_x95ozE8MmkI8kkUJ8QK', // كلمة السر الحقيقية المستخرجة من صورتك
    database: 'defaultdb', // القاعدة التي رفعت إليها الجداول بنجاح
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        ca: caCert // تفعيل التشفير لضمان قبول الاتصال السحابي
    }
});

// اختبار الاتصال بالسحابة عند بدء التشغيل
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ فشل الاتصال بقاعدة بيانات Aiven السحابية!");
        console.error("تأكد من كلمة السر ومن وجود ملف ca.pem.");
        console.error("الخطأ:", err.message);
        return;
    }
    console.log("✅ تم الاتصال بقاعدة بيانات Aiven السحابية بنجاح عبر SSL.");
    connection.release();
});


// 2. رابط تسجيل الدخول (المعدل لحل مشكلة الانهيار)
app.post('/login', (req, res) => {
    const { username, phone } = req.body;

    if (!username || !phone) {
        return res.status(400).send({ error: "البيانات ناقصة" });
    }

    const checkSql = "SELECT * FROM users WHERE phone = ?";
    
    db.query(checkSql, [phone], (err, result) => {
        if (err) {
            console.error("❌ خطأ أثناء البحث عن المستخدم:", err.message);
            return res.status(500).send({ error: "خطأ في قاعدة البيانات" });
        }

        // فحص النتيجة بأمان
        if (result && result.length > 0) {
            console.log(`✨ مستخدم موجود مسبقاً: ${username}`);
            return res.send(result[0]);
        } else {
            const insertSql = "INSERT INTO users (username, phone) VALUES (?, ?)";
            db.query(insertSql, [username, phone], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error("❌ خطأ أثناء إضافة مستخدم جديد:", insertErr.message);
                    return res.status(500).send({ error: "فشل إنشاء الحساب" });
                }
                console.log(`🆕 تم تسجيل مستخدم جديد: ${username}`);
                res.send({ id: insertResult.insertId, username, phone });
            });
        }
    });
});

// 3. رابط جلب قائمة المستخدمين
app.get('/users', (req, res) => {
    db.query("SELECT id, username, phone FROM users", (err, result) => {
        if (err) {
            console.error("❌ خطأ في جلب المستخدمين:", err.message);
            return res.status(500).send([]);
        }
        res.send(result);
    });
});

// 4. إعداد Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let onlineUsers = {}; 

io.on('connection', (socket) => {
    socket.on('join', (phone) => {
        onlineUsers[phone] = socket.id;
        console.log(`📱 المستخدم [${phone}] متصل الآن.`);
    });

    socket.on('send_private_msg', (data) => {
        const { sender, receiver, message } = data;
        const sql = "INSERT INTO messages (sender_phone, receiver_phone, message_text) VALUES (?, ?, ?)";
        
        db.query(sql, [sender, receiver, message], (err) => {
            if (err) console.error("❌ خطأ في حفظ الرسالة:", err.message);
            
            if (onlineUsers[receiver]) {
                io.to(onlineUsers[receiver]).emit('receive_msg', data);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log("👋 مستخدم قطع الاتصال.");
    });
});

server.listen(3000, () => {
    console.log("🚀 السيرفر يعمل الآن على المنفذ 3000");
});