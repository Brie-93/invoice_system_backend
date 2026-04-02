import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import apiRoutes from './routes/apiRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://invoice-system-uyig.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes); 
app.use('/api/app', apiRoutes);

app.get('/', (req, res) => {
  res.send('Interior Design API is running...');
});

app.get('/api/version', (req, res) => res.json({ ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});