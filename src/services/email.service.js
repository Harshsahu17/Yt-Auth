import config from "../config/config.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN
    }
})

// verify connection configuration
transporter.verify((error, success) => { 
    if (error) {
        console.error("Error connecting to email service: ", error);
    }
    else {
        console.log("Email server is ready to send messages");
    }
});

export const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Yt-Auth" <${config.GOOGLE_USER}>`,// sender address
            to, // list of receivers
            subject,  // Subject line
            text,  // plain text body
            html  // html body
        });

        console.log("Email sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("Error sending email: ", error);
    }
};
