const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối PostgreSQL
const { pool } = require('./models/db');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.set('view engine', 'ejs');

// Session
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: 'giaydep123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Routes
app.use('/', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/orders', require('./routes/orders'));

// Trang chủ
app.get('/', (req, res) => {
  res.render('home');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) return res.status(403).send('Cấm truy cập');
  next();
}

app.get('/admin', requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  res.render('admin/dashboard', { products: result.rows });
});

// Form tạo sản phẩm
app.get('/admin/products/create', requireAdmin, (req, res) => {
  res.send(`
    <form method="POST" action="/admin/products/create">
      <input name="name" placeholder="Tên" />
      <input name="price" placeholder="Giá" />
      <input name="image" placeholder="URL ảnh" />
      <textarea name="description" placeholder="Mô tả"></textarea>
      <button type="submit">Tạo</button>
    </form>
  `);
});

// Xử lý tạo
app.post('/admin/products/create', requireAdmin, async (req, res) => {
  const { name, price, image, description } = req.body;
  await pool.query('INSERT INTO products (name, price, image, description) VALUES ($1, $2, $3, $4)', [name, price, image, description]);
  res.redirect('/admin');
});

// Xử lý xoá
app.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM products WHERE id = $1', [id]);
  res.redirect('/admin');
});
