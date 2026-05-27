import userModel from '../models/user.model.js';
import crypto from 'crypto';  // ← typo fix
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import sessionModel from '../models/session.model.js';
import { sendEmail } from '../services/email.service.js';
import { generateOtp, getOtpHtml } from '../utils/utils.js';
import otpModel from '../models/otp.model.js';

export async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const isAlreadyRegistered = await userModel.findOne({
            $or: [{ username }, { email }]
        });

        if (isAlreadyRegistered) {
            return res.status(409).json({ message: "Username or email already exists" });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        const user = await userModel.create({ username, email, password: hashedPassword });

        const otp = generateOtp();
        const html = getOtpHtml(otp);
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        await otpModel.create({ email, user: user._id, otpHash });
        await sendEmail(email, "OTP Verification", `Your OTP is: ${otp}`, html);

        res.status(201).json({
            message: "User registered successfully",
            user: { username: user.username, email: user.email, isVerified: user.isVerified }
        });

    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            return res.status(401).json({ message: "Email not verified" });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        if (hashedPassword !== user.password) {
            return res.status(404).json({ message: "Invalid email or password" });
        }

        const refreshToken = jwt.sign({ id: user._id }, config.JWT_SECRET, { expiresIn: '7d' });
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const session = await sessionModel.create({
            user: user._id,
            refreshTokenHash,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        const accessToken = jwt.sign(
            { id: user._id, sessionId: session._id },
            config.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: "Logged in successfully",
            user: { username: user.username, email: user.email },
            accessToken
        });

    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getMe(req, res) {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Token not provided" });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await userModel.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User fetched successfully",
            user: { username: user.username, email: user.email }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function refreshToken(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token not provided" });
        }

        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const session = await sessionModel.findOne({ refreshTokenHash, revoked: false });

        if (!session) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        const newRefreshToken = jwt.sign({ id: decoded.id }, config.JWT_SECRET, { expiresIn: '7d' });
        const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

        session.refreshTokenHash = newRefreshTokenHash;
        await session.save();

        // sessionId bhi include karo ✅
        const accessToken = jwt.sign(
            { id: decoded.id, sessionId: session._id },
            config.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({ message: "Access token refreshed successfully", accessToken });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function logout(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token not provided" });
        }

        jwt.verify(refreshToken, config.JWT_SECRET);

        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const session = await sessionModel.findOneAndUpdate(
            { refreshTokenHash, revoked: false },
            { revoked: true },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ message: "Session not found or already logged out" });
        }

        res.clearCookie('refreshToken');
        res.status(200).json({ message: "Logged out successfully" });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.clearCookie('refreshToken');
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function logoutAll(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token not provided" });
        }

        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

        await sessionModel.updateMany({ user: decoded.id, revoked: false }, { revoked: true });

        res.clearCookie('refreshToken');
        res.status(200).json({ message: "Logged out from all sessions successfully" });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.clearCookie('refreshToken');
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function verifyEmail(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');  // ← fix

        const otpRecord = await otpModel.findOne({ email, otpHash });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const user = await userModel.findByIdAndUpdate(
            otpRecord.user,
            { isVerified: true },
            { new: true }
        );

        await otpModel.deleteMany({ user: otpRecord.user });

        res.status(200).json({
            message: "Email verified successfully",
            user: { username: user.username, email: user.email, isVerified: user.isVerified }
        });

    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}