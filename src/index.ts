// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import apiRoutes from './routes/apiRoutes';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allows frontend to talk to backend
app.use(express.json()); // Allows backend to understand JSON

// Routes
app.use('/api/auth', authRoutes); 
app.use('/api/app', apiRoutes);


app.get('/', (req, res) => {
  res.send('Interior Design API is running...');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});