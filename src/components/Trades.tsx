import { useEffect, useState } from "react";
import styled from "styled-components";
import { NAMES } from "../data/photoNames";

const API = "";

type Trade = {
    id: number;
    status: string;
    requester_email: string;
    requested_filename: string;
    offered_filename: string;
};

const Wrapper = styled.div`
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
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

const Img = styled.img`
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 12px;
`;

const Button = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 700;
  margin-right: 8px;
`;

export default function Trades() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [msg, setMsg] = useState("");

    async function fetchTrades() {
        const res = await fetch(`${API}/api/trades/incoming`, {
            credentials: "include",
        });

        const data = await res.json();
        return data.trades ?? [];
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
        setTrades(await fetchTrades());
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const trades = await fetchTrades();

                if (!cancelled) {
                    setTrades(trades);
                }
            } catch (err) {
                if (!cancelled) {
                    setMsg("Failed to load trades.");
                }
                console.error(err);
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Wrapper>
            <h1>Trades</h1>

            {msg && <p>{msg}</p>}

            {trades.length === 0 && <p>No trades yet.</p>}

            {trades.map((trade) => (
                <Card key={trade.id}>
                    <p>
                        <strong>{trade.requester_email}</strong> wants {" "}
                        <strong>{NAMES[trade.requested_filename] ?? trade.requested_filename}</strong>.
                    </p>

                    <p>
                        They are offering{" "}
                        <strong>{NAMES[trade.offered_filename] ?? trade.offered_filename}</strong>.
                    </p>

                    <Row>
                        <div>
                            <p>Your photo</p>
                            <Img src={`/${trade.requested_filename}`} />
                        </div>

                        <div>
                            <p>Their offer</p>
                            <Img src={`/${trade.offered_filename}`} />
                        </div>
                    </Row>

                    {trade.status === "pending" ? (
                        <div style={{ marginTop: 16 }}>
                            <Button onClick={() => respond(trade.id, "accept")}>Accept</Button>
                            <Button onClick={() => respond(trade.id, "reject")}>Reject</Button>
                        </div>
                    ) : (
                        <p>Status: {trade.status}</p>
                    )}
                </Card>
            ))}
        </Wrapper>
    );
}