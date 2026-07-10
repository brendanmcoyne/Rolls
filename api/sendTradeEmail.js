import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const authorization = req.headers.authorization;

    if (authorization !== `Bearer ${process.env.EMAIL_RELAY_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const {
        to,
        requesterEmail,
        requestedFilename,
        offeredFilename,
    } = req.body ?? {};

    if (
        !to ||
        !requesterEmail ||
        !requestedFilename ||
        !offeredFilename
    ) {
        return res.status(400).json({ error: "Missing email information" });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error("Gmail environment variables are missing");
        return res.status(500).json({ error: "Email is not configured" });
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    try {
        const info = await transporter.sendMail({
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
                <p><strong>${escapeHtml(requesterEmail)}</strong> wants to trade with you.</p>
                <p><strong>They want:</strong> ${escapeHtml(requestedFilename)}</p>
                <p><strong>They are offering:</strong> ${escapeHtml(offeredFilename)}</p>
                <p>
                    <a
                        href="${escapeHtml(process.env.FRONTEND_URL)}"
                        style="
                            display: inline-block;
                            background-color: #444444;
                            color: #ffffff;
                            padding: 12px 18px;
                            border-radius: 10px;
                            text-decoration: none;
                            font-weight: bold;
                            font-size: 15px;
                        "
                    >
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

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Trade email failed:", error);

        return res.status(500).json({
            error: "Could not send trade email",
        });
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
} //Please work