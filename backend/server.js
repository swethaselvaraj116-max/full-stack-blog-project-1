import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-blog-app-12345';

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Crypto Hashing Helper
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, originalHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === originalHash;
}

// Auth Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(403).json({ error: 'Session expired. Please log in again.' });
  }
}

// Helper: Slug Generator
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);
}

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || username.trim().length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username must be at least 3 chars and password at least 6.' });
  }

  try {
    // Check if user exists
    const checkUser = db.prepare('SELECT id FROM users WHERE username = ?');
    const existing = checkUser.get(username.trim());
    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const { salt, hash } = hashPassword(password);
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)');
    const result = insertUser.run(username.trim(), hash, salt);

    res.status(201).json({ message: 'User registered successfully. Please log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = getUser.get(username.trim());

    if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Sign Token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

// Check current user status
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ user: null });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: verified.id, username: verified.username } });
  } catch (err) {
    res.clearCookie('token');
    res.json({ user: null });
  }
});


// --- POSTS ROUTES ---

// Get all posts
app.get('/api/posts', (req, res) => {
  try {
    const getPosts = db.prepare(`
      SELECT posts.*, users.username as author 
      FROM posts 
      JOIN users ON posts.author_id = users.id 
      ORDER BY posts.created_at DESC
    `);
    const posts = getPosts.all();
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// Get single post by slug
app.get('/api/posts/:slug', (req, res) => {
  try {
    const getPost = db.prepare(`
      SELECT posts.*, users.username as author 
      FROM posts 
      JOIN users ON posts.author_id = users.id 
      WHERE posts.slug = ?
    `);
    const post = getPost.get(req.params.slug);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// Create Post (auth required)
app.post('/api/posts', authenticateToken, (req, res) => {
  const { title, content, summary, tags } = req.body;

  if (!title || !content || !summary) {
    return res.status(400).json({ error: 'Title, summary, and content are required.' });
  }

  try {
    const slug = generateSlug(title);
    const insertPost = db.prepare(`
      INSERT INTO posts (title, slug, content, summary, tags, author_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = insertPost.run(
      title.trim(),
      slug,
      content,
      summary.trim(),
      tags ? tags.trim() : '',
      req.user.id
    );

    res.status(201).json({ id: result.lastInsertRowid, slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// Update Post (auth required + must be author)
app.put('/api/posts/:id', authenticateToken, (req, res) => {
  const { title, content, summary, tags } = req.body;
  const postId = req.params.id;

  if (!title || !content || !summary) {
    return res.status(400).json({ error: 'Title, summary, and content are required.' });
  }

  try {
    // Check if post exists and check owner
    const checkPost = db.prepare('SELECT author_id FROM posts WHERE id = ?');
    const post = checkPost.get(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to edit this post.' });
    }

    const updatePost = db.prepare(`
      UPDATE posts 
      SET title = ?, content = ?, summary = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updatePost.run(title.trim(), content, summary.trim(), tags ? tags.trim() : '', postId);

    res.json({ message: 'Post updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// Delete Post (auth required + must be author)
app.delete('/api/posts/:id', authenticateToken, (req, res) => {
  const postId = req.params.id;

  try {
    const checkPost = db.prepare('SELECT author_id FROM posts WHERE id = ?');
    const post = checkPost.get(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' });
    }

    const deletePost = db.prepare('DELETE FROM posts WHERE id = ?');
    deletePost.run(postId);

    res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
