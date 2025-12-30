import styled from "styled-components";
import Rules from "./components/Rules.tsx";
import Scrolling from "./components/Scrolling.tsx";
import Rolls from "./components/Rolls.tsx";

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

export default function App() {
    return (
        <>
            <Scrolling />
            <Page>
                <Rolls
                    onClaim={(slotIndex, slots) => {
                        console.log("Claimed slot:", slotIndex, "Slots:", slots);

                    }}
                />

                <Rules />
            </Page>
        </>
    );
}
