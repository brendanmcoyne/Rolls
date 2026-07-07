import { useEffect, useState } from "react";
import styled from "styled-components";
import { NAMES } from "../data/photoNames";

const API = "";

type Trade = {
    id: number;
    status: string;
    requester_email?: string;
    recipient_email?: string;
    requested_filename: string;
    offered_filename: string;
};

type TradeTab = "incoming" | "outgoing";

const Wrapper = styled.div`
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
`;

const Tabs = styled.div`
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
`;

const Title = styled.h1`
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
    font-size: clamp(3rem, 9vw, 7rem);
    line-height: 0.95;
    letter-spacing: -0.08em;
`;

const TabButton = styled.button<{ $active?: boolean }>`
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid ${(p) => (p.$active ? "white" : "rgba(255, 255, 255, 0.25)")};
    background: ${(p) => (p.$active ? "white" : "#1f2937")};
    color: ${(p) => (p.$active ? "#111827" : "white")};
    font-weight: 800;
    cursor: pointer;
    justify-content: center;

    &:hover {
        transform: translateY(-1px);
    }
`;

const Card = styled.div`
    background: #1f2937;
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 16px;
`;

const Row = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
`;

const PhotoBlock = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const Img = styled.img`
    width: 140px;
    height: 140px;
    object-fit: cover;
    border-radius: 12px;
`;

const Button = styled.button<{ $red?: boolean; $gray?: boolean }>`
    padding: 10px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-weight: 700;
    margin-right: 8px;
    background: ${(p) => {
        if (p.$red) return "#dc2626";
        if (p.$gray) return "#6b7280";
        return "white";
    }};
    color: ${(p) => (p.$red || p.$gray ? "white" : "#111827")};

    &:hover {
        transform: translateY(-1px);
    }
`;

const Message = styled.p`
    color: #facc15;
    font-weight: 700;
`;

const StatusText = styled.p`
    margin-top: 16px;
    font-weight: 700;
    color: #d1d5db;
`;

const EmptyText = styled.p`
    color: #d1d5db;
`;

function getPhotoName(filename: string) {
    return NAMES[filename] ?? filename;
}

function capitalizeStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Trades() {
    const [tab, setTab] = useState<TradeTab>("incoming");
    const [incomingTrades, setIncomingTrades] = useState<Trade[]>([]);
    const [outgoingTrades, setOutgoingTrades] = useState<Trade[]>([]);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const trades = tab === "incoming" ? incomingTrades : outgoingTrades;

    const activeTrades = trades.filter((trade) => trade.status === "pending");
    const oldTrades = trades.filter((trade) => trade.status !== "pending").slice(0, 10);
    const visibleTrades = [...activeTrades, ...oldTrades];

    async function fetchIncomingTrades() {
        const res = await fetch(`${API}/api/trades/incoming`, {
            credentials: "include",
        });

        const data = await res.json();
        return data.trades ?? [];
    }

    async function fetchOutgoingTrades() {
        const res = await fetch(`${API}/api/trades/outgoing`, {
            credentials: "include",
        });

        const data = await res.json();
        return data.trades ?? [];
    }

    async function refreshTrades() {
        setLoading(true);

        try {
            const [incoming, outgoing] = await Promise.all([
                fetchIncomingTrades(),
                fetchOutgoingTrades(),
            ]);

            setIncomingTrades(incoming);
            setOutgoingTrades(outgoing);
        } catch (err) {
            setMsg("Failed to load trades.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function respond(id: number, action: "accept" | "reject") {
        const res = await fetch(`${API}/api/trades/${id}/${action}`, {
            method: "POST",
            credentials: "include",
        });

        if (!res.ok) {
            const data = await res.json();
            setMsg(data.error ?? "Something went wrong");
            return;
        }

        setMsg(action === "accept" ? "Trade accepted!" : "Trade rejected.");
        await refreshTrades();
    }

    async function withdraw(id: number) {
        const res = await fetch(`${API}/api/trades/${id}/withdraw`, {
            method: "POST",
            credentials: "include",
        });

        if (!res.ok) {
            const data = await res.json();
            setMsg(data.error ?? "Something went wrong");
            return;
        }

        setMsg("Trade withdrawn.");
        await refreshTrades();
    }

    useEffect(() => {
        void refreshTrades();
    }, []);

    return (
        <Wrapper>
            <Title>Trades</Title>

            <Tabs>
                <TabButton
                    $active={tab === "incoming"}
                    onClick={() => {
                        setTab("incoming");
                        setMsg("");
                    }}
                >
                    Incoming
                </TabButton>

                <TabButton
                    $active={tab === "outgoing"}
                    onClick={() => {
                        setTab("outgoing");
                        setMsg("");
                    }}
                >
                    Outgoing
                </TabButton>
            </Tabs>

            {msg && <Message>{msg}</Message>}

            {loading && <EmptyText>Loading trades...</EmptyText>}

            {!loading && visibleTrades.length === 0 && (
                <EmptyText>
                    {tab === "incoming"
                        ? "No incoming trades yet."
                        : "No outgoing trades yet."}
                </EmptyText>
            )}

            {visibleTrades.map((trade) => (
                <Card key={trade.id}>
                    {tab === "incoming" ? (
                        <>
                            <p>
                                <strong>{trade.requester_email}</strong> wants{" "}
                                <strong>
                                    {getPhotoName(trade.requested_filename)}
                                </strong>
                                .
                            </p>

                            <p>
                                They are offering{" "}
                                <strong>
                                    {getPhotoName(trade.offered_filename)}
                                </strong>
                                .
                            </p>

                            <Row>
                                <PhotoBlock>
                                    <p>Your photo</p>
                                    <Img
                                        src={`/${trade.requested_filename}`}
                                        alt={getPhotoName(trade.requested_filename)}
                                    />
                                </PhotoBlock>

                                <PhotoBlock>
                                    <p>Their offer</p>
                                    <Img
                                        src={`/${trade.offered_filename}`}
                                        alt={getPhotoName(trade.offered_filename)}
                                    />
                                </PhotoBlock>
                            </Row>

                            {trade.status === "pending" ? (
                                <div style={{ marginTop: 16 }}>
                                    <Button onClick={() => respond(trade.id, "accept")}>
                                        Accept
                                    </Button>
                                    <Button $red onClick={() => respond(trade.id, "reject")}>
                                        Reject
                                    </Button>
                                </div>
                            ) : (
                                <StatusText>Status: {capitalizeStatus(trade.status)}</StatusText>
                            )}
                        </>
                    ) : (
                        <>
                            <p>
                                You asked <strong>{trade.recipient_email}</strong> for{" "}
                                <strong>
                                    {getPhotoName(trade.requested_filename)}
                                </strong>
                                .
                            </p>

                            <p>
                                You offered{" "}
                                <strong>
                                    {getPhotoName(trade.offered_filename)}
                                </strong>
                                .
                            </p>

                            <Row>
                                <PhotoBlock>
                                    <p>Requested photo</p>
                                    <Img
                                        src={`/${trade.requested_filename}`}
                                        alt={getPhotoName(trade.requested_filename)}
                                    />
                                </PhotoBlock>

                                <PhotoBlock>
                                    <p>Your offer</p>
                                    <Img
                                        src={`/${trade.offered_filename}`}
                                        alt={getPhotoName(trade.offered_filename)}
                                    />
                                </PhotoBlock>
                            </Row>

                            {trade.status === "pending" ? (
                                <div style={{ marginTop: 16 }}>
                                    <Button $gray onClick={() => withdraw(trade.id)}>
                                        Withdraw
                                    </Button>
                                </div>
                            ) : (
                                <StatusText>Status: {capitalizeStatus(trade.status)}</StatusText>
                            )}
                        </>
                    )}
                </Card>
            ))}
        </Wrapper>
    );
}