import crypto from "node:crypto";

function fingerprint(value) {
    return crypto
        .createHash("sha256")
        .update(value)
        .digest("hex")
        .slice(0, 8);
}

export async function sendTradeRequestEmail({
                                                to,
                                                requesterEmail,
                                                requestedFilename,
                                                offeredFilename,
                                            }) {
    const relayUrl = String(
        process.env.EMAIL_RELAY_URL ?? ""
    ).trim();

    const relaySecret = String(
        process.env.EMAIL_RELAY_SECRET ?? ""
    ).trim();

    if (!relayUrl) {
        throw new Error("EMAIL_RELAY_URL is missing");
    }

    if (!relaySecret) {
        throw new Error("EMAIL_RELAY_SECRET is missing");
    }

    console.log("Calling email relay:", {
        relayUrl,
        secretLength: relaySecret.length,
        secretFingerprint: fingerprint(relaySecret),
    });

    const response = await fetch(relayUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${relaySecret}`,
        },
        body: JSON.stringify({
            to,
            requesterEmail,
            requestedFilename,
            offeredFilename,
        }),
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        const responseBody = await response.text();

        throw new Error(
            `Email relay returned ${response.status}: ${responseBody}`
        );
    }

    return response.json();
}