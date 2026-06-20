import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  LogIn, 
  LogOut, 
  UserPlus, 
  Clock, 
  User, 
  Tag, 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Save, 
  X 
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); // home, login, register, post, create, edit
  const [selectedPostSlug, setSelectedPostSlug] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  
  // Notification State
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Check user authentication on load
  useEffect(() => {
    checkAuth();
    fetchPosts();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error verifying authentication:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      showNotification('Failed to load posts', 'error');
    }
  };

  const navigateTo = (newView, slug = null, postObj = null) => {
    setView(newView);
    if (slug) setSelectedPostSlug(slug);
    if (postObj) setEditingPost(postObj);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar glass">
        <div className="navbar-container">
          <a href="#" className="navbar-logo" onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>
            <BookOpen size={24} />
            <span>DevBlog</span>
          </a>
          <div className="navbar-links">
            <a href="#" className="btn btn-secondary" onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>
              Home
            </a>
            
            {user ? (
              <div className="navbar-user">
                <span>Welcome, <strong>{user.username}</strong></span>
                <button className="btn btn-primary" onClick={() => navigateTo('create')}>
                  <PlusCircle size={18} />
                  Write Post
                </button>
                <button className="btn btn-secondary" onClick={async () => {
                  await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
                  setUser(null);
                  showNotification('Successfully logged out');
                  navigateTo('home');
                }}>
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => navigateTo('login')}>
                  <LogIn size={18} />
                  Login
                </button>
                <button className="btn btn-primary" onClick={() => navigateTo('register')}>
                  <UserPlus size={18} />
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="content-wrapper">
        {view === 'home' && (
          <HomeView 
            posts={posts} 
            navigateTo={navigateTo} 
          />
        )}
        
        {(view === 'login' || view === 'register') && (
          <AuthView 
            view={view} 
            setView={setView} 
            setUser={setUser} 
            showNotification={showNotification} 
            navigateTo={navigateTo} 
          />
        )}

        {view === 'post' && (
          <PostDetailView 
            slug={selectedPostSlug} 
            user={user} 
            navigateTo={navigateTo} 
            fetchPosts={fetchPosts}
            showNotification={showNotification} 
          />
        )}

        {view === 'create' && (
          <EditorView 
            user={user} 
            navigateTo={navigateTo} 
            fetchPosts={fetchPosts}
            showNotification={showNotification}
          />
        )}

        {view === 'edit' && (
          <EditorView 
            user={user} 
            post={editingPost} 
            navigateTo={navigateTo} 
            fetchPosts={fetchPosts}
            showNotification={showNotification}
          />
        )}
      </main>
    </div>
  );
}

// ==========================================
// VIEW COMPONENTS
// ==========================================

// 1. Home View
function HomeView({ posts, navigateTo }) {
  return (
    <div>
      <div className="home-hero">
        <h1>Express your thoughts. Share your craft.</h1>
        <p>A beautiful dark-themed space for developers and writers to share stories, tutorials, and insights.</p>
      </div>

      {posts.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <h3>No posts found</h3>
          <p style={{ marginTop: '0.5rem' }}>Be the first one to create a post!</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map(post => (
            <div key={post.id} className="blog-card glass">
              <div className="blog-card-meta">
                <span className="blog-card-author">
                  <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {post.author}
                </span>
                <span>
                  <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="blog-card-title">{post.title}</h2>
              <p className="blog-card-summary">{post.summary}</p>
              
              <div className="blog-card-footer">
                <div className="blog-card-tags">
                  {post.tags && post.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="tag">{tag.trim()}</span>
                  ))}
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => navigateTo('post', post.slug)}
                >
                  Read More
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 2. Auth View (Login / Register)
function AuthView({ view, setView, setUser, showNotification, navigateTo }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    const endpoint = view === 'login' ? 'login' : 'register';

    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(data.error || 'An error occurred', 'error');
      } else {
        if (view === 'login') {
          setUser(data.user);
          showNotification(`Welcome back, ${data.user.username}!`);
          navigateTo('home');
        } else {
          showNotification(data.message || 'Registration successful! Please log in.');
          setView('login');
          setPassword('');
        }
      }
    } catch (err) {
      console.error(err);
      showNotification('Network error, please try again later', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <h2>{view === 'login' ? 'Welcome Back' : 'Join DevBlog'}</h2>
        <p>{view === 'login' ? 'Enter your details to log into your account' : 'Create an account to start writing and sharing'}</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="auth-username">Username</label>
            <input 
              id="auth-username"
              type="text" 
              className="form-control"
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input 
              id="auth-password"
              type="password" 
              className="form-control"
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : view === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-switch">
          {view === 'login' ? (
            <span>
              Don't have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setView('register'); setUsername(''); setPassword(''); }}>Sign up</a>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); setUsername(''); setPassword(''); }}>Log in</a>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. Post Detail View
function PostDetailView({ slug, user, navigateTo, fetchPosts, showNotification }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPostDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/posts/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
        } else {
          showNotification('Post not found', 'error');
          navigateTo('home');
        }
      } catch (err) {
        console.error(err);
        showNotification('Failed to load post detail', 'error');
        navigateTo('home');
      } finally {
        setLoading(false);
      }
    };
    fetchPostDetail();
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`${API_URL}/posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok) {
        showNotification('Post deleted successfully');
        fetchPosts();
        navigateTo('home');
      } else {
        showNotification(data.error || 'Failed to delete post', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Network error during deletion', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  if (!post) return null;

  const isAuthor = user && user.id === post.author_id;

  return (
    <div className="post-detail">
      <button className="btn btn-secondary" onClick={() => navigateTo('home')} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} />
        Back to Home
      </button>

      <div className="post-detail-header">
        <h1 className="post-detail-title">{post.title}</h1>
        <div className="post-detail-meta">
          <span>
            <User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            By <strong>{post.author}</strong>
          </span>
          <span>
            <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {new Date(post.created_at).toLocaleDateString()}
          </span>
          {post.tags && (
            <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <Tag size={16} />
              {post.tags.split(',').map((tag, idx) => (
                <span key={idx} className="tag">{tag.trim()}</span>
              ))}
            </span>
          )}
        </div>

        {isAuthor && (
          <div className="post-detail-actions">
            <button className="btn btn-secondary" onClick={() => navigateTo('edit', null, post)}>
              <Edit3 size={16} />
              Edit
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="post-detail-content">
        {/* Simple paragraph formatting */}
        {post.content.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

// 4. Editor View (Create / Edit)
function EditorView({ user, post, navigateTo, fetchPosts, showNotification }) {
  const isEditMode = !!post;
  const [title, setTitle] = useState(isEditMode ? post.title : '');
  const [summary, setSummary] = useState(isEditMode ? post.summary : '');
  const [content, setContent] = useState(isEditMode ? post.content : '');
  const [tags, setTags] = useState(isEditMode ? post.tags : '');
  const [submitting, setSubmitting] = useState(false);

  // Unauthorized access check
  if (!user) {
    setTimeout(() => {
      showNotification('You must be logged in to access this page', 'error');
      navigateTo('login');
    }, 0);
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !content.trim()) {
      showNotification('Title, summary, and content are required.', 'error');
      return;
    }

    setSubmitting(true);
    const endpoint = isEditMode ? `${API_URL}/posts/${post.id}` : `${API_URL}/posts`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, content, tags }),
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        showNotification(isEditMode ? 'Post updated successfully' : 'Post created successfully!');
        fetchPosts();
        navigateTo('home');
      } else {
        showNotification(data.error || 'Failed to save post', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Network error while saving post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-card glass">
        <h2>{isEditMode ? 'Edit Blog Post' : 'Create New Post'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="editor-title">Title</label>
            <input 
              id="editor-title"
              type="text" 
              className="form-control"
              placeholder="e.g. Mastering CSS Grid" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="editor-summary">Summary</label>
            <input 
              id="editor-summary"
              type="text" 
              className="form-control"
              placeholder="A brief subtitle or card summary..." 
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="editor-tags">Tags (comma-separated)</label>
            <input 
              id="editor-tags"
              type="text" 
              className="form-control"
              placeholder="CSS, Design, WebDev" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="editor-content">Content</label>
            <textarea 
              id="editor-content"
              rows="12" 
              className="form-control"
              placeholder="Write your article here..." 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="editor-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => isEditMode ? navigateTo('post', post.slug) : navigateTo('home')}
              disabled={submitting}
            >
              <X size={16} />
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
