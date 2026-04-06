<<<<<<< HEAD
import nodemailer from 'nodemailer';

export async function sendEmail(email,subject ,message, attachments=[]) {
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.nodeMailerEmail,
                pass:  process.env.nodeMailerPassword,
            },
        });
        let info = await transporter.sendMail({
          from: process.env.nodeMailerEmail,
            to: email,
            subject,
            html: message,
            attachments
        });
        return info
    }
=======
import nodemailer from 'nodemailer';

export async function sendEmail(email,subject ,message, attachments=[]) {
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.nodeMailerEmail,
                pass:  process.env.nodeMailerPassword,
            },
        });
        let info = await transporter.sendMail({
          from: process.env.nodeMailerEmail,
            to: email,
            subject,
            html: message,
            attachments
        });
        return info
    }
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
