import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: [true, 'User is required']
    },
    refreshTokenHash: {
        type: String,
        required: [true, 'Refresh token hash is required']          
    },
    ip: {
        type: String,
        required: [true, 'IP address is required']
    },
    userAgent: {
        type: String,
        required: [true, 'User agent is required']  
    },
    revoked: {
        type: Boolean,
        default: false
    }},
    { timestamps: true }
);

sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

const sessionModel = mongoose.model('sessions', sessionSchema); 

export default sessionModel;