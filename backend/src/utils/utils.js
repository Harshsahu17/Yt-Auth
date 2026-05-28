export function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString(); 
}

export function getOtpHtml(otp) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;    
            align-items: center;
            height: 100vh;
        }        
        .container {
            background-color: #fff;
            padding: 20px 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        h2 {
            color: #333;
        }  
        .otp {
            font-size: 24px;
            font-weight: bold;
            color: #007BFF;
            margin: 20px 0;
        }      
        p {
            color: #555;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Your OTP Code</h2>
        <p class="otp">${otp}</p>
        <p>Please use this OTP to verify your email address.</p>
        <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
        <p>Thank you for using our service!</p>
    </div>
</body>
</html>`;
}   