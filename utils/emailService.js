const nodemailer = require('nodemailer');

// Configure the email transporter using environment variables
// Make sure to set these in your .env file
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} text - The plain text body of the email.
 * @param {string} [html] - The HTML body of the email (optional).
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Set default sender email
    const from = `"Wholescalers" <${process.env.EMAIL_USER}>`;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // In a real app, you might have more robust error handling
  }
};