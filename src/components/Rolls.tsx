import { useState } from "react";
import styled from "styled-components";

const IMAGES = Array.from({ length: 40 }, (_, i) => `/${i + 1}.jpg`);

interface ButtonProps {
    red?: boolean;
}

interface SlotProps {
    selected?: boolean;
}

const SlotBox = styled.div<SlotProps>`
    width: 100%;
    aspect-ratio: 1 / 1;
    max-width: 260px;
    height: 260px;
    background-color: #374151;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: 0.1s;
    &:hover {
        transform: scale(1.05);
    }
    border: ${p => p.selected ? "3px solid white" : "none"};

`;
const Button = styled.button<ButtonProps>`
    padding: 8px 16px;
    border-radius: 0.75rem;
    min-width: 120px;
    font-size: 1.125rem;

    background-color: ${(p) => (p.red ? "#dc2626" : "#2563eb")};
    &:hover {
        background-color: ${(p) => (p.red ? "#b91c1c" : "#1d4ed8")};
        border: 1px solid black;
    }
`;

const Page = styled.div`
    min-height: 100vh;
    width: 100%;
    background-color: #111827;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
`;

const Title = styled.h1`
    font-size: 1.875rem;
    font-weight: 700;
    margin-bottom: 24px;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    width: 100%;
    max-width: 900px;

    justify-items: center;
`;

const SlotImage = styled.img`
  width: 260px;
  height: 260px;
  object-fit: cover;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
    margin-top: 20px;
`;


export default function Rolls() {
    const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null, null, null,]);
    const [currentSlot, setCurrentSlot] = useState(0);
    const [claim, setClaim] = useState(null);

    const rollImage = () => {
        if (currentSlot >= 6) return;

        const availableImages = IMAGES.filter(img => !slots.includes(img));

        if (availableImages.length === 0) return;

        const randomIndex = Math.floor(Math.random() * availableImages.length);
        const newImage = availableImages[randomIndex];

        const updatedSlots = [...slots];
        updatedSlots[currentSlot] = newImage;

        setSlots(updatedSlots);
        setCurrentSlot(currentSlot + 1);
    };

    const reset = () => {
        setSlots([null, null, null, null, null, null]);
        setCurrentSlot(0);
    };

    return (
        <>
            <Page>
                <Title>Pasta Rolls</Title>

                <Grid>
                    {slots.map((img, i) => (
                        <SlotBox key={i} onClick={() => setClaim(i)} selected={claim === i}>
                            {img ? (<SlotImage src={img} alt="slot" />) : (<span style={{ opacity: 0.4 }}>Empty</span>)}
                        </SlotBox>
                    ))}
                </Grid>

                <ButtonRow>
                    <Button onClick={rollImage}>Roll</Button>
                    <Button red onClick={reset}>Claim</Button>
                </ButtonRow>
            </Page>
        </>
    );
}
