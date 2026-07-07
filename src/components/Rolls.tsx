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
    }
`;

const SlotBox = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
    width: 260px;
    height: 260px;
    background-color: #374151;
    border-radius: 12px;
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
    border: ${(p) => (p.$selected ? "3px solid white" : "none")};
    opacity: ${(p) => (p.$disabled ? 0.5 : 1)};

    @media screen and (max-width: 850px) {
        width: 175px;
        height: 175px;
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
    border: none;
    cursor: pointer;

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

const Message = styled.p`
    margin-top: 16px;
    color: #facc15;
    font-size: 18px;
    font-weight: 600;
`;

const PopupOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;

const PopupCard = styled.div`
    width: min(90vw, 420px);
    background: #111827;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    padding: 28px;
    color: white;
    text-align: center;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7);
`;

const PopupImage = styled.img`
    width: 92px;
    height: 92px;
    border-radius: 999px;
    object-fit: cover;
    border: 3px solid white;
    margin-bottom: 16px;
`;

const PopupTitle = styled.h2`
    margin: 0;
    font-size: 28px;
    line-height: 1.2;

    @media screen and (max-width: 750px) {
        font-size: 22px;
    }
`;

const PopupButton = styled.button`
    margin-top: 22px;
    padding: 10px 18px;
    border-radius: 12px;
    border: none;
    background: white;
    color: #111827;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
        transform: translateY(-1px);
    }
`;

export default function Rolls() {
    const [rolled, setRolled] = useState<Slot[]>([]);
    const [slots, setSlots] = useState<Slot[]>(Array(6).fill(null));
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [locked, setLocked] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [claimedPhoto, setClaimedPhoto] = useState<Slot>(null);

    const getPhotoName = (filename: string) => {
        return NAMES[filename] ?? filename;
    };

    const startRoll = async () => {
        setMsg(null);
        setLocked(false);
        setSelected(null);
        setClaimedPhoto(null);

        const res = await fetch(`${API}/api/roll?n=6`, {
            credentials: "include",
        });

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

        if (!res.ok) {
            setMsg("Something went wrong while claiming this photo.");
            return;
        }

        setClaimedPhoto(slot);
        setMsg(null);
        setLocked(true);
    };

    return (
        <>
            <Grid>
                {slots.map((slot, i) => (
                    <SlotBox
                        key={i}
                        $selected={selected === i}
                        $disabled={!slot || locked}
                        onClick={() => slot && !locked && setSelected(i)}
                    >
                        {slot ? (
                            <Img src={`/${slot.filename}`} alt={getPhotoName(slot.filename)} />
                        ) : (
                            "Empty"
                        )}
                    </SlotBox>
                ))}
            </Grid>

            <ButtonRow>
                {rolled.length === 0 ? (
                    <Button onClick={startRoll}>Roll</Button>
                ) : index < rolled.length ? (
                    <Button onClick={revealNext}>Roll</Button>
                ) : (
                    <Button $red onClick={claim} disabled={selected === null || locked}>
                        Claim
                    </Button>
                )}
            </ButtonRow>

            {msg && <Message>{msg}</Message>}

            {claimedPhoto && (
                <PopupOverlay onClick={() => setClaimedPhoto(null)}>
                    <PopupCard onClick={(e) => e.stopPropagation()}>
                        <PopupImage
                            src={`/${claimedPhoto.filename}`}
                            alt={getPhotoName(claimedPhoto.filename)}
                        />

                        <PopupTitle>
                            Congrats on claiming {getPhotoName(claimedPhoto.filename)}!
                        </PopupTitle>

                        <PopupButton onClick={() => setClaimedPhoto(null)}>
                            Awesome
                        </PopupButton>
                    </PopupCard>
                </PopupOverlay>
            )}
        </>
    );
}