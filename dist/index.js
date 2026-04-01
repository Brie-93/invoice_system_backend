"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const apiRoutes_1 = __importDefault(require("./routes/apiRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)()); // Allows frontend to talk to backend
app.use(express_1.default.json()); // Allows backend to understand JSON
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/app', apiRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Interior Design API is running...');
});
app.get('/api/version', (req, res) => res.json({ ts: new Date().toISOString() }));
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
