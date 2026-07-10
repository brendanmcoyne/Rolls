import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function sendTradeRequestEmail({
                                                to,
                                                requesterEmail,
                                                requestedFilename,
                                                offeredFilename,
                                            }) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn("Gmail email settings are missing. Trade email not sent.");
        return;
    }

    await transporter.sendMail({
        from: `"Pasta Rolls" <${process.env.GMAIL_USER}>`,
        to,
        replyTo: requesterEmail,
        subject: "You have a new trade request on Pasta Rolls",
        text: `
You have a new trade request on Pasta Rolls.

From: ${requesterEmail}

They want: ${requestedFilename}
They are offering: ${offeredFilename}

View the trade request:
${process.env.FRONTEND_URL}
        `.trim(),
        html: `
            <h2>You have a new trade request on Pasta Rolls</h2>
            <p><strong>${requesterEmail}</strong> wants to trade with you.</p>
            <p><strong>They want:</strong> ${requestedFilename}</p>
            <p><strong>They are offering:</strong> ${offeredFilename}</p>
            <p>
                <a href="${process.env.FRONTEND_URL}">
                    View trade request
                </a>
            </p>
        `,
    });

    console.log("Trade request email sent to:", to);
}