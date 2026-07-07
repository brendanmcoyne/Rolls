import { useEffect, useState } from "react";
import styled from "styled-components";

const API = "";

const Wrapper = styled.div`
    margin-top: 50px;
    text-align: center;
    color: #dddddd;
    max-width: 800px;
`;

const DescriptionHeader = styled.h2`
    font-size: 40px;
    margin-bottom: 10px;
`;

const PhotoStats = styled.div`
    margin-top: 30px;
    padding: 20px 18px;
    border-radius: 12px;
    background-color: #1f2937;
    color: white;
    font-size: 24px;
    font-weight: 700;
`;

type Stats = {
    total: number;
    claimed: number;
    remaining: number;
};

export default function Rules() {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        fetch(`${API}/api/photo-stats`, {
            credentials: "include",
        })
            .then((res) => res.json())
            .then(setStats)
            .catch(() => setStats(null));
    }, []);

    return (
        <Wrapper>
            <DescriptionHeader>Welcome to Pasta Rolls!</DescriptionHeader>

            <p>
                This is a randomly generated photo claiming game, in which every day, you
                get 6 chances to claim one of hundreds of photos for your own collection.
                These photos will be linked to your Google account, and can be viewed at
                any time.
            </p>

            <p>
                For every 6 photos you view, you may only claim 1 of those 6. Once every
                3 hours you can claim another photo (2 o'clock, 5 o'clock, 8 o'clock, 11
                o'clock).
            </p>

            <p>
                Once a photo is claimed, no one else is able to get that photo. If you
                decide to remove a photo from your collection, that photo is put back
                into the list of available photos.
            </p>

            <p style={{marginBottom: "30px"}}>
                The Claims tab shows every photo you have claimed connected to your
                Google account. The Gallery tab shows every photo that can be found, and
                which have already been claimed.
            </p>

            {stats && (
                <PhotoStats>
                    {stats.remaining.toLocaleString()} / {stats.total.toLocaleString()} photos still available
                </PhotoStats>
            )}
        </Wrapper>
    );
}