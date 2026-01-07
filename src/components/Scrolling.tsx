import { createGlobalStyle } from "styled-components";

const HideScrollbar = createGlobalStyle`
    html, body {
        margin: 0;
        padding: 0;
        overflow-y: auto;
        scrollbar-width: none;
    }

    ::-webkit-scrollbar {
        display: none; 
    }
`;

export default function Scrolling() {
    return <HideScrollbar />;
}
