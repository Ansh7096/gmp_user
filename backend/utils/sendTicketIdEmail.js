import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Helper function to create a standardized, styled email template
const createStyledEmail = (subject, contentHtml) => {
    // The FRONTEND_URL should be set in your .env file (e.g., https://gmp-user-ui41.vercel.app)
    const frontendUrl = process.env.FRONTEND_URL || '#';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; background-color: #f4f7f6; }
            .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
            .email-header { background-color: #f8f8f8; padding: 20px; text-align: center; border-bottom: 1px solid #e0e0e0;}
            .email-header img { max-width: 220px; }
            .email-body { padding: 30px; font-size: 16px; line-height: 1.6; color: #333333; }
            .email-body p { margin: 0 0 15px 0; }
            .email-body h2 { color: #004a9c; margin-top: 0; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 14px 28px; background-color: #005A9C; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .email-footer { background-color: #f8f8f8; padding: 20px; font-size: 14px; color: #888888; text-align: center; border-top: 1px solid #e0e0e0; }
            ul { list-style-type: none; padding-left: 0; }
            li { background: #fafafa; margin-bottom: 8px; padding: 12px; border-left: 4px solid #005A9C; border-radius: 4px; }
            li strong { color: #333; }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <img src="https://gmp-user-ui41.vercel.app/gmp-logo-preview.png" alt="LNMIIT Grievance Portal Logo">
            </div>
            <div class="email-body">
                ${contentHtml}
            </div>
            <div class="email-footer">
                <p>This is an automated message. Please do not reply directly to this email.</p>
                <p>&copy; ${new Date().getFullYear()} LNMIIT Grievance Management Portal</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Send the user their grievance ticket ID and resolution timeline.
 */
export const sendTicketIdEmail = async (email, name, ticketId, urgency, resolveIn) => {
    if (!email) {
        console.error("sendTicketIdEmail: missing recipient email, aborting send");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const subject = `Your Grievance Has Been Logged: ${ticketId}`;
    const content = `
        <h2>Grievance Submitted Successfully</h2>
        <p>Hi ${name},</p>
        <p>Thank you for reaching out. Your grievance has been successfully logged in our system.</p>
        <h3>Your Grievance Details:</h3>
        <ul>
            <li><strong>Ticket ID:</strong> ${ticketId}</li>
            <li><strong>Urgency Level:</strong> ${urgency}</li>
            <li><strong>Expected Resolution Timeline:</strong> Within ${resolveIn}</li>
        </ul>
        <div class="button-container">
            <a href="${process.env.FRONTEND_URL || '#'}/track-grievance" class="button">Track Your Grievance</a>
        </div>
        <p>Regards,<br>The LNMIIT Grievance Team</p>
    `;
    const html = createStyledEmail(subject, content);

    const mailOptions = {
        from: `"LNMIIT Grievance Portal" <${process.env.EMAIL_USER}>`,
        to: `"${name}" <${email}>`,
        subject: subject,
        html: html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Ticket ID email sent:", info.response);
    } catch (err) {
        console.error("Error sending ticket ID email:", err);
        throw err;
    }
};