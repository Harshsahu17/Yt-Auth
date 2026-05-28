import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import authRouter from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
  origin: 'http://127.0.0.1:5501',  // Live Server ka default port
  credentials: true                  // cookies allow karne ke liye
}));

app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

app.use('/api/auth', authRouter);

export default app;