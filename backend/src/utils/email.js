const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Email templates
const emailTemplates = {
    welcome: (name) => ({
        subject: 'Welcome to Richard Fitness!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6;">Welcome to Richard Fitness, ${name}!</h2>
                <p>Thank you for joining our fitness community. We're excited to help you achieve your fitness goals!</p>
                <p>Here's what you can expect:</p>
                <ul>
                    <li>Access to state-of-the-art equipment</li>
                    <li>Expert personal trainers</li>
                    <li>Variety of group classes</li>
                    <li>Supportive community environment</li>
                </ul>
                <p>If you have any questions, don't hesitate to contact us.</p>
                <p>Best regards,<br>The Richard Fitness Team</p>
            </div>
        `
    }),
    
    bookingConfirmation: (name, bookingDetails) => ({
        subject: 'Booking Confirmation - Richard Fitness',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6;">Booking Confirmed!</h2>
                <p>Hi ${name},</p>
                <p>Your booking has been confirmed with the following details:</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p><strong>Type:</strong> ${bookingDetails.type}</p>
                    <p><strong>Date:</strong> ${bookingDetails.date}</p>
                    <p><strong>Time:</strong> ${bookingDetails.startTime} - ${bookingDetails.endTime}</p>
                    ${bookingDetails.trainer ? `<p><strong>Trainer:</strong> ${bookingDetails.trainer}</p>` : ''}
                    ${bookingDetails.class ? `<p><strong>Class:</strong> ${bookingDetails.class}</p>` : ''}
                </div>
                <p>We look forward to seeing you!</p>
                <p>Best regards,<br>The Richard Fitness Team</p>
            </div>
        `
    }),
    
    membershipExpiry: (name, daysRemaining) => ({
        subject: 'Membership Expiry Reminder - Richard Fitness',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">Membership Expiring Soon</h2>
                <p>Hi ${name},</p>
                <p>This is a friendly reminder that your membership will expire in ${daysRemaining} days.</p>
                <p>To continue enjoying our facilities and services, please renew your membership.</p>
                <p>Contact us to renew or if you have any questions.</p>
                <p>Best regards,<br>The Richard Fitness Team</p>
            </div>
        `
    }),
    
    contactResponse: (name, message) => ({
        subject: 'Response to Your Inquiry - Richard Fitness',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6;">Thank you for contacting us!</h2>
                <p>Hi ${name},</p>
                <p>Thank you for reaching out to Richard Fitness. Here's our response to your inquiry:</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    ${message}
                </div>
                <p>If you have any further questions, please don't hesitate to contact us.</p>
                <p>Best regards,<br>The Richard Fitness Team</p>
            </div>
        `
    })
};

// Send email function
const sendEmail = async (to, template, data = {}) => {
    try {
        const transporter = createTransporter();
        
        if (!emailTemplates[template]) {
            throw new Error(`Email template '${template}' not found`);
        }
        
        const emailContent = emailTemplates[template](data.name || 'Member', data);
        
        const mailOptions = {
            from: `"Richard Fitness" <${process.env.SMTP_USER}>`,
            to: to,
            subject: emailContent.subject,
            html: emailContent.html
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

// Send bulk emails
const sendBulkEmail = async (recipients, template, data = {}) => {
    const results = [];
    
    for (const recipient of recipients) {
        const result = await sendEmail(recipient.email, template, {
            ...data,
            name: recipient.name || 'Member'
        });
        
        results.push({
            email: recipient.email,
            ...result
        });
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
};

// Test email connection
const testEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Email server connection successful');
        return true;
    } catch (error) {
        console.error('Email server connection failed:', error);
        return false;
    }
};

module.exports = {
    sendEmail,
    sendBulkEmail,
    testEmailConnection,
    emailTemplates
};