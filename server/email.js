import nodemailer from "nodemailer";
import dns from "node:dns/promises";

async function createGmailTransporter() {
    const addresses = await dns.resolve4("smtp.gmail.com");

    if (!addresses.length) {
        throw new Error("Could not resolve smtp.gmail.com to an IPv4 address");
    }

    const smtpIPv4 = addresses[0];

    console.log("Using Gmail SMTP IPv4:", smtpIPv4);

    return nodemailer.createTransport({
        host: smtpIPv4,
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: {
            servername: "smtp.gmail.com",
        },
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

export async function sendTradeRequestEmail({
                                                to,
                                                requesterEmail,
                                            }) {
    console.log("sendTradeRequestEmail called:", {
        to,
        from: process.env.GMAIL_USER,
        hasGmailUser: Boolean(process.env.GMAIL_USER),
        hasGmailAppPassword: Boolean(process.env.GMAIL_APP_PASSWORD),
    });

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn("Gmail email settings are missing. Trade email not sent.");
        return;
    }

    const transporter = await createGmailTransporter();

    const info = await transporter.sendMail({
        from: `"Pasta Rolls" <${process.env.GMAIL_USER}>`,
        to,
        replyTo: requesterEmail,
        subject: "You have a new trade request on Pasta Rolls",
        text: `
You have a new trade request on Pasta Rolls.

From: ${requesterEmail}

View the trade request:
${process.env.FRONTEND_URL}
        `.trim(),
        html: `
            <h2>You have a new trade request on Pasta Rolls</h2>
            <p>You have a new trade!</p>
            <p><strong>${requesterEmail}</strong> wants to trade with you.</p>

            <p style="margin-top: 30px;">Click below to access the trade!</p>
            <p>
                <a href="${process.env.FRONTEND_URL}"
                style="
                        display: inline-block;
                        background-color: #444444;
                        color: #ffffff;
                        padding: 12px 18px;
                        border-radius: 10px;
                        text-decoration: none;
                        font-weight: bold;
                        font-size: 15px;
                    ">
                    View trade request
                </a>
            </p>
        `,
    });

    console.log("Trade email sent:", {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
    });
}