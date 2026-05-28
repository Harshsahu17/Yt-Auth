# 🔐 Yt-Auth

A production-ready **REST API for authentication** built with Node.js, Express 5, and MongoDB.

Supports full user lifecycle — registration, email OTP verification, JWT-based login with rotating refresh tokens, multi-device session management, and secure logout.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Server](#running-the-server)
- [API Reference](#api-reference)
  - [Register](#1-register)
  - [Verify Email](#2-verify-email)
  - [Login](#3-login)
  - [Get Current User](#4-get-current-user)
  - [Refresh Token](#5-refresh-token)
  - [Logout](#6-logout)
  - [Logout All Devices](#7-logout-all-devices)
- [Authentication Flow](#authentication-flow)
- [Security Decisions](#security-decisions)
- [Database Models](#database-models)

---

## ✨ Features

- ✅ User registration with hashed password
- ✅ Email OTP verification via **Gmail OAuth2**
- ✅ OTP auto-expiry using **MongoDB TTL index** (10 minutes)
- ✅ JWT **access tokens** (15 min) + **refresh tokens** (7 days)
- ✅ **Refresh token rotation** — old token invalidated on every refresh
- ✅ Refresh tokens stored as **SHA-256 hash** in DB (never raw)
- ✅ Session tracking with **IP address** and **User-Agent**
- ✅ **Single device logout** and **logout from all devices**
- ✅ Sessions auto-expire after **30 days** via MongoDB TTL

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB + Mongoose 9 |
| Authentication | JSON Web Tokens (jsonwebtoken) |
| Email | Nodemailer + Gmail OAuth2 |
| Environment | dotenv |
| Logging | Morgan |
| Cookie Parsing | cookie-parser |

---

## 📁 Project Structure

```
yt-auth/
├── server.js                  # Entry point
├── package.json
├── .env                       # Environment variables (not committed)
├── .gitignore
└── src/
    ├── app.js                 # Express app setup, middlewares
    ├── config/
    │   ├── config.js          # Env variable validation & export
    │   └── database.js        # MongoDB connection
    ├── models/
    │   ├── user.model.js      # User schema
    │   ├── session.model.js   # Session schema (refresh token store)
    │   └── otp.model.js       # OTP schema (TTL: 10 min)
    ├── controllers/
    │   └── auth.controller.js # All auth logic
    ├── routes/
    │   └── auth.routes.js     # Route definitions
    ├── services/
    │   └── email.service.js   # Nodemailer Gmail OAuth2
    └── utils/
        └── utils.js           # OTP generator, HTML email template
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.19.0
- MongoDB instance (local or Atlas)
- Gmail account with OAuth2 credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/Harshsahu17/Yt-Auth.git

# Navigate to project directory
cd Yt-Auth

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/yt-auth

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Gmail OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_USER=your_gmail_address@gmail.com
```

> **How to get Gmail OAuth2 credentials:**
> 1. Go to [Google Cloud Console](https://console.cloud.google.com/)
> 2. Create a project → Enable Gmail API
> 3. Create OAuth2 credentials (Desktop app)
> 4. Use [OAuth Playground](https://developers.google.com/oauthplayground/) to get refresh token
> 5. Select `https://mail.google.com/` scope

### Running the Server

```bash
# Development (with nodemon)
npm run dev

# Production
node server.js
```

Server runs on `http://localhost:3000`

---

## 📡 API Reference

Base URL: `http://localhost:3000/api/auth`

---

### 1. Register

```
POST /api/auth/register
```

Creates a new user and sends an OTP to the provided email.

**Request Body:**
```json
{
  "username": "harshsahu",
  "email": "harsh@example.com",
  "password": "mypassword123"
}
```

**Response `201`:**
```json
{
  "message": "User registered successfully",
  "user": {
    "username": "harshsahu",
    "email": "harsh@example.com",
    "isVerified": false
  }
}
```

**Error Responses:**
| Status | Message |
|---|---|
| 400 | All fields are required |
| 409 | Username or email already exists |
| 500 | Internal server error |

---

### 2. Verify Email

```
POST /api/auth/verify-email
```

Verifies the user's email using the OTP sent during registration.

**Request Body:**
```json
{
  "email": "harsh@example.com",
  "otp": "482910"
}
```

**Response `200`:**
```json
{
  "message": "Email verified successfully",
  "user": {
    "username": "harshsahu",
    "email": "harsh@example.com",
    "isVerified": true
  }
}
```

**Error Responses:**
| Status | Message |
|---|---|
| 400 | Email and OTP are required |
| 400 | Invalid or expired OTP |
| 500 | Internal server error |

> **Note:** OTP expires automatically after **10 minutes**.

---

### 3. Login

```
POST /api/auth/login
```

Authenticates the user and returns a JWT access token. Sets refresh token as an httpOnly cookie.

**Request Body:**
```json
{
  "email": "harsh@example.com",
  "password": "mypassword123"
}
```

**Response `200`:**
```json
{
  "message": "Logged in successfully",
  "user": {
    "username": "harshsahu",
    "email": "harsh@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Sets cookie:
```
refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error Responses:**
| Status | Message |
|---|---|
| 400 | All fields are required |
| 401 | Email not verified |
| 404 | Invalid email or password |
| 500 | Internal server error |

---

### 4. Get Current User

```
GET /api/auth/get-me
```

Returns the currently authenticated user's info.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response `200`:**
```json
{
  "message": "User fetched successfully",
  "user": {
    "username": "harshsahu",
    "email": "harsh@example.com"
  }
}
```

**Error Responses:**
| Status | Message |
|---|---|
| 401 | Token not provided |
| 401 | Invalid or expired token |
| 404 | User not found |
| 500 | Internal server error |

---

### 5. Refresh Token

```
POST /api/auth/refresh-token
```

Issues a new access token using the refresh token from the cookie. Also rotates the refresh token.

**Cookie Required:** `refreshToken`

**Response `200`:**
```json
{
  "message": "Access token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
| Status | Message |
|---|---|
| 401 | Refresh token not provided |
| 401 | Invalid refresh token |
| 401 | Invalid or expired refresh token |
| 500 | Internal server error |

---

### 6. Logout

```
POST /api/auth/logout
```

Revokes the current device's session and clears the refresh token cookie.

**Cookie Required:** `refreshToken`

**Response `200`:**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
| Status | Message |
|---|---|
| 401 | Refresh token not provided |
| 404 | Session not found or already logged out |
| 500 | Internal server error |

---

### 7. Logout All Devices

```
POST /api/auth/logout-all
```

Revokes all active sessions for the current user across all devices.

**Cookie Required:** `refreshToken`

**Response `200`:**
```json
{
  "message": "Logged out from all sessions successfully"
}
```

---

## 🔄 Authentication Flow

```
REGISTER
──────────────────────────────────────────────
Client → POST /register
       ← 201 { user, isVerified: false }
       ← OTP email sent

VERIFY EMAIL
──────────────────────────────────────────────
Client → POST /verify-email { email, otp }
       ← 200 { user, isVerified: true }

LOGIN
──────────────────────────────────────────────
Client → POST /login { email, password }
       ← 200 { accessToken } + cookie: refreshToken

ACCESS PROTECTED ROUTE
──────────────────────────────────────────────
Client → GET /get-me
         Header: Authorization: Bearer <accessToken>
       ← 200 { user }

TOKEN REFRESH (when accessToken expires)
──────────────────────────────────────────────
Client → POST /refresh-token
         Cookie: refreshToken
       ← 200 { new accessToken } + new cookie: refreshToken

LOGOUT
──────────────────────────────────────────────
Client → POST /logout
         Cookie: refreshToken
       ← 200 { message }
```

---

## 🔒 Security Decisions

### Password Hashing
Passwords are stored as **SHA-256 hashes**. For higher security in production, consider migrating to `bcrypt` which is slower by design and more resistant to brute-force attacks.

### Refresh Token Storage
The raw refresh token is **never stored** in the database. Only its SHA-256 hash is saved. This means even if the database is compromised, tokens cannot be used directly.

### Token Rotation
Every time `/refresh-token` is called, the old refresh token is **invalidated** and a new one is issued. This limits the window of exploitation if a token is stolen.

### httpOnly Cookies
Refresh tokens are stored in `httpOnly; Secure; SameSite=Strict` cookies — inaccessible to JavaScript, preventing XSS-based token theft.

### Session Tracking
Each session records the user's **IP address** and **User-Agent**, making it possible to detect suspicious logins or allow users to review their active sessions.

### Auto-expiring Documents
- **OTPs** expire after **10 minutes** via MongoDB TTL index
- **Sessions** expire after **30 days** via MongoDB TTL index

No manual cleanup jobs required.

---

## 🗄 Database Models

### User
| Field | Type | Description |
|---|---|---|
| username | String | Unique, required |
| email | String | Unique, required |
| password | String | SHA-256 hashed |
| isVerified | Boolean | Default: false |

### Session
| Field | Type | Description |
|---|---|---|
| user | ObjectId | Ref to User |
| refreshTokenHash | String | SHA-256 of refresh token |
| ip | String | Client IP address |
| userAgent | String | Client browser/device |
| revoked | Boolean | Default: false |
| createdAt | Date | TTL: 30 days |

### OTP
| Field | Type | Description |
|---|---|---|
| email | String | User's email |
| user | ObjectId | Ref to User |
| otpHash | String | SHA-256 of OTP |
| createdAt | Date | TTL: 10 minutes |

---

## 📄 License

ISC

---

> Built for learning purposes. Star ⭐ the repo if you found it helpful!
