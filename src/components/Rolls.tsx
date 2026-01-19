import { useState } from "react";
import styled from "styled-components";
import { NAMES } from "../data/photoNames.ts";

type Slot = { id: number; filename: string } | null;

const API = "";

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 25px;

    @media screen and (max-width: 750px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
`;

const SlotBox = styled.div<{ selected?: boolean; disabled?: boolean }>`
    width: 260px;
    height: 260px;
    background-color: #374151;
    border-radius: 12px;
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
    border: ${(p) => (p.selected ? "3px solid white" : "none")};
    opacity: ${(p) => (p.disabled ? 0.5 : 1)};

    @media screen and (max-width: 750px) {
        width: 100%;
        aspect-ratio: 1 / 1;
        height: auto;
    }
`;

const Img = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 16px;
    margin-top: 20px;
`;

const Button = styled.button<{ $red?: boolean }>`
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 18px;
    background: ${(p) => (p.$red ? "#dc2626" : "#2563eb")};
    color: white;
`;

export default function Rolls() {
    const [rolled, setRolled] = useState<Slot[]>([]);
    const [slots, setSlots] = useState<Slot[]>(Array(6).fill(null));
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [locked, setLocked] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const startRoll = async () => {
        setMsg(null);
        setLocked(false);
        setSelected(null);

        const res = await fetch(`${API}/api/roll?n=6`, {credentials: "include",});
        const data = await res.json();

        const newSlots: Slot[] = Array(6).fill(null);

        if (data.slots.length > 0) {
            newSlots[0] = data.slots[0];
        }

        setRolled(data.slots);
        setSlots(newSlots);
        setIndex(1);
    };


    const revealNext = () => {
        if (index >= rolled.length) return;

        const copy = [...slots];
        copy[index] = rolled[index];
        setSlots(copy);
        setIndex(index + 1);
    };

    const claim = async () => {
        if (locked || selected === null) return;

        const slot = slots[selected];
        if (!slot) return;

        const res = await fetch(`${API}/api/claim`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoId: slot.id }),
        });

        if (res.status === 429) {
            const data = await res.json();
            const reset = new Date(data.retryAt);
            setMsg(`You can claim again at ${reset.toLocaleTimeString()}`);
            setLocked(true);
            return;
        }

        const getClaimMessage = (filename: string) => {
            const name = NAMES[filename] ?? filename;

            if (name === "Bros") return "You claimed the Bros!";
            if (name === "Party") return "You claimed a Party!";

            return `You claimed ${name}!`;
        };

        setMsg(getClaimMessage(slot.filename));
        setLocked(true);
    };

    return (
        <>
            <Grid>
                {slots.map((slot, i) => (
                    <SlotBox
                        key={i}
                        selected={selected === i}
                        disabled={!slot || locked}
                        onClick={() => slot && !locked && setSelected(i)}
                    >
                        {slot ? <Img src={`/${slot.filename}`} /> : "Empty"}
                    </SlotBox>
                ))}
            </Grid>

            <ButtonRow>
                {rolled.length === 0 ? (
                    <Button onClick={startRoll}>Roll</Button>
                ) : index < rolled.length ? (
                    <Button onClick={revealNext}>Roll</Button>
                ) : (
                    <Button $red onClick={claim}>Claim</Button>
                )}
            </ButtonRow>

            {msg && <p>{msg}</p>}
        </>
    );
}
