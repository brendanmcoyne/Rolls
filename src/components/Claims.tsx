import { useEffect, useState } from "react";
import styled from "styled-components";

type Card = {
    id: number;
    filename: string;
    claimed_at: string;
};

const API = "";

const Page = styled.div`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
`;

const Title = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(180px, 1fr));
    gap: 16px;
    @media screen and (max-width: 750px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const CardBox = styled.div`
    aspect-ratio: 1 / 1;
    background-color: #374151;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    transition: 0.3s;
    &:hover {
        transform: scale(1.05);
        @media screen and (max-width: 750px) {
            transform: none;
        }
    }
`;

const Img = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const RemoveButton = styled.button`
    position: absolute;
    bottom: 8px;
    right: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: #dc2626;
    color: white;
    border: none;
    cursor: pointer;
    opacity: 0.9;

    &:hover {
        opacity: 1;
    }
`;

const Empty = styled.div`
    opacity: 0.6;
    font-size: 0.9rem;
    text-align: center;
`;

export default function Claims() {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API}/api/my-claims`, {
            credentials: "include",
        })
            .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then((data) => {
                setCards(data.cards || []);
                setLoading(false);
            })
            .catch(() => {
                setError("Could not load your collection.");
                setLoading(false);
            });
    }, []);

    const unclaim = async (photoId: number) => {
        const res = await fetch(`${API}/api/unclaim`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoId }),
        });

        if (!res.ok) {
            alert("Failed to remove claim");
            return;
        }

        setCards((prev) => prev.filter((c) => c.id !== photoId));
    };

    if (loading) return <Page>Loading your claims…</Page>;
    if (error) return <Page>{error}</Page>;

    return (
        <Page>
            <Title>Claims</Title>

            {cards.length === 0 ? (
                <Empty>You haven’t claimed any photos yet.</Empty>
            ) : (
                <Grid>
                    {cards.map((card) => (
                        <CardBox key={card.id}>
                            <Img src={`/${card.filename}`} alt={card.filename} />
                            <RemoveButton onClick={() => unclaim(card.id)}>
                                Remove
                            </RemoveButton>
                        </CardBox>
                    ))}
                </Grid>
            )}
        </Page>
    );
}
