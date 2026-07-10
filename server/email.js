export async function sendTradeRequestEmail({
                                                to,
                                                requesterEmail,
                                                requestedFilename,
                                                offeredFilename,
                                            }) {
    if (!process.env.EMAIL_RELAY_URL) {
        throw new Error("EMAIL_RELAY_URL is missing");
    }

    if (!process.env.EMAIL_RELAY_SECRET) {
        throw new Error("EMAIL_RELAY_SECRET is missing");
    }

    const response = await fetch(process.env.EMAIL_RELAY_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EMAIL_RELAY_SECRET}`,
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