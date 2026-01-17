import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { NAMES } from "../data/photoNames";

const API = "";

type Claim = {
    id: number;
    filename: string;
    claimed_by: number;
};

const Wrapper = styled.div`
    max-width: 1200px;
    margin: 0 auto;
`;

const SearchRow = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
`;

const Search = styled.input`
    width: 300px;
    padding: 8px 12px;
    font-size: 16px;
`;

const GroupGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 260px);
    gap: 16px;
    justify-content: center;
`;

const GroupCard = styled.div`
    background: #1f2937;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: transform 0.15s ease;

    &:hover {
        transform: translateY(-4px);
    }
`;

const GroupTitle = styled.div`
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
`;

const GroupCount = styled.div`
    font-size: 14px;
    opacity: 0.8;
`;

const BackRow = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
`;

const BackButton = styled.button`
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 350px);
    gap: 16px;
`;

const SlotBox = styled.div`
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
    object-position: center;
`;

const Claimed = styled.p`
    position: absolute;
    bottom: 8px;
    right: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: #ffbf1f;
    color: white;
    border: none;
    opacity: 0.9;
`;

const Title = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
`;

export default function Gallery() {
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [claims, setClaims] = useState<Claim[]>([]);

    useEffect(() => {
        fetch(`${API}/api/claims`, {
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => setClaims(data.claims))
            .catch(() => setClaims([]));
    }, []);

    const claimedByFilename = useMemo(() => {
        const map = new Map<string, Claim>();
        claims.forEach((c) => map.set(c.filename, c));
        return map;
    }, [claims]);

    const groupedResults = useMemo(() => {
        if (!query.trim()) return [];

        const groups: Record<string, number> = {};

        Object.values(NAMES).forEach((tag) => {
            const people = tag.split("&").map((p) => p.trim());
            if (people.some((p) =>
                p.toLowerCase().includes(query.toLowerCase())
            )) {
                groups[tag] = (groups[tag] || 0) + 1;
            }
        });

        return Object.entries(groups).map(([tag, count]) => ({
            tag,
            count,
        }));
    }, [query]);

    const photosForActiveTag = useMemo(() => {
        if (!activeTag) return [];
        return Object.entries(NAMES).filter(([, tag]) => tag === activeTag);
    }, [activeTag]);

    return (
        <Wrapper>
            <Title>Gallery</Title>
            <SearchRow>
                <Search
                    placeholder="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </SearchRow>

            {!activeTag && (
                <GroupGrid>
                    {groupedResults.map(({ tag, count }) => (
                        <GroupCard key={tag} onClick={() => setActiveTag(tag)}>
                            <GroupTitle>{tag}</GroupTitle>
                            <GroupCount>
                                {count} photo{count !== 1 ? "s" : ""}
                            </GroupCount>
                        </GroupCard>
                    ))}
                </GroupGrid>
            )}

            {activeTag && (
                <>
                    <BackRow>
                        <BackButton onClick={() => setActiveTag(null)}>
                            ← Back
                        </BackButton>
                    </BackRow>

                    <Grid>
                        {photosForActiveTag.map(([filename, tag]) => {
                            const claim = claimedByFilename.get(filename);
                            return (
                                <SlotBox key={filename}>
                                    <Img src={`/${filename}`} alt={tag} />
                                    {claim && (<Claimed>Claimed</Claimed>)}
                                </SlotBox>
                            );
                        })}
                    </Grid>
                </>
            )}
        </Wrapper>
    );
}
