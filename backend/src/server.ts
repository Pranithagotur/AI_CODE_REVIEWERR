import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { initDatabase, query } from './db';
import { runStaticRules } from './services/ruleEngine';
import { executeCode } from './services/sandbox';
import { getAiCodeReview } from './services/aiReviewer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_12345';

// Middleware
app.use(cors());
app.use(express.json());

// Token Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired.' });
    }
    req.user = user as any;
    next();
  });
}

// Optional Auth Middleware for endpoints that can be run anonymously
function optionalAuthenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      // Invalid token but proceeding as guest
      return next();
    }
    req.user = user as any;
    next();
  });
}

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    // Check if user already exists
    const existing: any[] = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dbResult = await query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully.',
      userId: dbResult.insertId
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Database execution failed.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const users: any[] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database execution failed.' });
  }
});

// --- CODE REVIEW ROUTE ---

app.post('/api/reviews/analyze', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { language, sourceCode, mode } = req.body;

  if (!language || !sourceCode) {
    return res.status(400).json({ error: 'Language and sourceCode variables are required.' });
  }

  const selectedMode = mode === 'student' ? 'student' : 'developer';

  try {
    console.log(`Starting review execution for ${language} in ${selectedMode} mode...`);

    // 1. Run Static Rules
    const ruleFeedback = runStaticRules(language, sourceCode);

    // 2. Run Execution Sandbox
    const runtimeFeedback = await executeCode(language, sourceCode);

    // 3. Request AI Review Feedback
    const aiFeedback = await getAiCodeReview(language, sourceCode, selectedMode);

    // 4. Save review results in DB if authenticated
    let reviewId = null;
    if (req.user) {
      const dbResult = await query(
        'INSERT INTO code_reviews (user_id, language, source_code, mode, ai_feedback, rule_feedback, runtime_feedback) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          req.user.id,
          language.toLowerCase(),
          sourceCode,
          selectedMode,
          JSON.stringify(aiFeedback),
          JSON.stringify(ruleFeedback),
          JSON.stringify(runtimeFeedback)
        ]
      );
      reviewId = dbResult.insertId;
    }

    res.json({
      reviewId,
      language,
      mode: selectedMode,
      ruleFeedback,
      runtimeFeedback,
      aiFeedback
    });
  } catch (error: any) {
    console.error('Code review analyze error:', error);
    res.status(500).json({ error: 'Review compilation or execution pipeline encountered an error.' });
  }
});

// --- HISTORY & STATS ROUTES ---

app.get('/api/reviews/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query(
      'SELECT id, language, mode, created_at FROM code_reviews WHERE user_id = ? ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Failed to retrieve review history.' });
  }
});

app.get('/api/reviews/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const reviewId = req.params.id;
  try {
    const rows = await query(
      'SELECT * FROM code_reviews WHERE id = ? AND user_id = ?',
      [reviewId, req.user!.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized.' });
    }

    const review = rows[0];
    res.json({
      id: review.id,
      language: review.language,
      source_code: review.source_code,
      mode: review.mode,
      aiFeedback: JSON.parse(review.ai_feedback || '{}'),
      ruleFeedback: JSON.parse(review.rule_feedback || '[]'),
      runtimeFeedback: JSON.parse(review.runtime_feedback || '{}'),
      created_at: review.created_at
    });
  } catch (err) {
    console.error('Fetch review detail error:', err);
    res.status(500).json({ error: 'Failed to retrieve review details.' });
  }
});

// --- KNOWLEDGE BASE ROUTES ---

app.get('/api/kb/search', async (req: Request, res: Response) => {
  const { category, language } = req.query;

  let sql = 'SELECT * FROM knowledge_base';
  const params: any[] = [];

  if (category || language) {
    sql += ' WHERE';
    const conditions: string[] = [];
    if (category) {
      conditions.push(' category = ?');
      params.push(category);
    }
    if (language) {
      conditions.push(' (language = ? OR language = ?)');
      params.push((language as string).toLowerCase(), 'all');
    }
    sql += conditions.join(' AND');
  }

  try {
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Knowledge base query error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge base.' });
  }
});

app.post('/api/kb/add', optionalAuthenticateToken, async (req: Request, res: Response) => {
  const { title, category, language, pattern, solution } = req.body;

  if (!title || !category || !language || !pattern || !solution) {
    return res.status(400).json({ error: 'Missing required knowledge base fields.' });
  }

  try {
    const dbResult = await query(
      'INSERT INTO knowledge_base (title, category, language, pattern, solution) VALUES (?, ?, ?, ?, ?)',
      [title, category, language.toLowerCase(), pattern, solution]
    );
    res.status(201).json({ message: 'Knowledge base article added.', articleId: dbResult.insertId });
  } catch (err) {
    console.error('Knowledge base insert error:', err);
    res.status(500).json({ error: 'Failed to save knowledge base article.' });
  }
});

// --- ANALYTICS/SUMMARY ROUTE ---

app.get('/api/analytics/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Total reviews count
    const totalReviewsRow = await query('SELECT COUNT(*) as count FROM code_reviews WHERE user_id = ?', [userId]);
    const totalReviews = totalReviewsRow[0]?.count || 0;

    // 2. Language distribution
    const languageRows = await query(
      'SELECT language, COUNT(*) as count FROM code_reviews WHERE user_id = ? GROUP BY language',
      [userId]
    );

    // 3. Recent quality trends
    const recentReviews = await query(
      'SELECT id, ai_feedback, created_at FROM code_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    // Analyze common mistakes from rule feedbacks
    const allReviews = await query('SELECT rule_feedback FROM code_reviews WHERE user_id = ?', [userId]);
    const commonMistakes: Record<string, number> = {};

    allReviews.forEach((review: any) => {
      try {
        const rules = JSON.parse(review.rule_feedback || '[]');
        rules.forEach((v: any) => {
          const ruleId = v.ruleId || 'other_bug';
          commonMistakes[ruleId] = (commonMistakes[ruleId] || 0) + 1;
        });
      } catch {}
    });

    const mistakesArray = Object.keys(commonMistakes).map(key => ({
      ruleId: key,
      count: commonMistakes[key]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Extract grades for progress chart
    const gradeHistory = recentReviews.map((r: any) => {
      let grade = 'A';
      try {
        const feedback = JSON.parse(r.ai_feedback || '{}');
        grade = feedback.code_quality?.rating || 'A';
      } catch {}
      return {
        id: r.id,
        date: r.created_at,
        grade
      };
    }).reverse();

    res.json({
      totalReviews,
      languages: languageRows,
      commonMistakes: mistakesArray,
      gradeHistory
    });
  } catch (err) {
    console.error('Fetch analytics summary error:', err);
    res.status(500).json({ error: 'Failed to aggregate analytics summary.' });
  }
});

// App initialization
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  try {
    await initDatabase();
    console.log('Database system initialized successfully.');
  } catch (dbErr: any) {
    console.error('Database connection failed during boot:', dbErr.message);
  }
});
