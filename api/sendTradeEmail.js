import nodemailer from "nodemailer";
import crypto from "node:crypto";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed",
        });
    }

    const expectedSecret = String(
        process.env.EMAIL_RELAY_SECRET ?? ""
    ).trim();

    const authorizationHeader = Array.isArray(
        req.headers.authorization
    )
        ? req.headers.authorization[0]
        : String(req.headers.authorization ?? "");

    const receivedSecret = authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice(7).trim()
        : "";

    console.log("Email relay authorization:", {
        expectedSecretExists: Boolean(expectedSecret),
        expectedSecretLength: expectedSecret.length,
        expectedFingerprint: fingerprint(expectedSecret),
        receivedSecretExists: Boolean(receivedSecret),
        receivedSecretLength: receivedSecret.length,
        receivedFingerprint: fingerprint(receivedSecret),
    });

    if (!secretsMatch(receivedSecret, expectedSecret)) {
        return res.status(401).json({
            error: "Unauthorized",
        });
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
        return res.status(400).json({
            error: "Missing email information",
        });
    }

    const gmailUser = String(
        process.env.GMAIL_USER ?? ""
    ).trim();

    const gmailAppPassword = String(
        process.env.GMAIL_APP_PASSWORD ?? ""
    ).trim();

    const frontendUrl = String(
        process.env.FRONTEND_URL ?? ""
    ).trim();

    if (!gmailUser || !gmailAppPassword) {
        console.error("Gmail environment variables are missing", {
            hasGmailUser: Boolean(gmailUser),
            hasGmailAppPassword: Boolean(gmailAppPassword),
        });

        return res.status(500).json({
            error: "Email is not configured",
        });
    }

    if (!frontendUrl) {
        console.error("FRONTEND_URL is missing");

        return res.status(500).json({
            error: "Frontend URL is not configured",
        });
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });

    try {
        console.log("Attempting to send trade email:", {
            to,
            requesterEmail,
            requestedFilename,
            offeredFilename,
        });

        const info = await transporter.sendMail({
            from: `"Pasta Rolls" <${gmailUser}>`,
            to,
            replyTo: requesterEmail,
            subject: "You have a new trade request on Pasta Rolls",

            text: `
You have a new trade request on Pasta Rolls.

From: ${requesterEmail}

They want: ${requestedFilename}
They are offering: ${offeredFilename}

View the trade request:
${frontendUrl}
            `.trim(),

            html: `
                <h2>You have a new trade request on Pasta Rolls</h2>

                <p>
                    <strong>${escapeHtml(requesterEmail)}</strong>
                    wants to trade with you.
                </p>

                <p>
                    <strong>They want:</strong>
                    ${escapeHtml(requestedFilename)}
                </p>

                <p>
                    <strong>They are offering:</strong>
                    ${escapeHtml(offeredFilename)}
                </p>

                <p>
                    <a
                        href="${escapeHtml(frontendUrl)}"
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

        return res.status(200).json({
            ok: true,
        });
    } catch (error) {
        console.error("Trade email failed:", error);

        return res.status(500).json({
            error: "Could not send trade email",
        });
    }
}

function secretsMatch(receivedSecret, expectedSecret) {
    if (!receivedSecret || !expectedSecret) {
        return false;
    }

    const receivedBuffer = Buffer.from(receivedSecret);
    const expectedBuffer = Buffer.from(expectedSecret);

    if (receivedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
    );
}

function fingerprint(value) {
    if (!value) {
        return null;
    }

    return crypto
        .createHash("sha256")
        .update(value)
        .digest("hex")
        .slice(0, 8);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}