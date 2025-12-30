import styled from "styled-components";

const Wrapper = styled.div`
    margin-top: 50px;
    text-align: center;
    color: #999999;
    max-width: 800px;
    border: 2px solid white;
`;

const DescriptionHeader = styled.h2`
    font-size: 40px;
`;


export default function Rules() {
    return (
        <Wrapper>
            <DescriptionHeader>Welcome to Pasta Rolls!</DescriptionHeader>

            <p>This is a randomly generated photo claiming game, in which every day,
            you get 4 chances to claim one of hundreds of photos for your own collection.
            These photos will be linked to your Google account, and can be viewed at any
            time. </p>

            <p>For every 6 photos you view, you may only claim 1 of those 6. Once 6 o'clock
            or 12 o'clock hits, then you can claim another photo.</p>
        </Wrapper>
    );
}