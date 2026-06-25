import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { NAMES } from "../data/photoNames";

const API = "";

type Claim = {
    id: number;
    filename: string;
    email: string;
};

const Wrapper = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px;
`;

const SearchRow = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
`;

const Search = styled.input`
    width: 100%;
    max-width: 320px;
    padding: 10px 14px;
    font-size: 16px; 
`;

const GroupGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 260px);
    gap: 16px;
    justify-content: center;
    @media screen and (max-width: 750px) {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }
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
    @media screen and (max-width: 750px) {
        justify-content: center;
    }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 250px);
    gap: 16px;
    @media screen and (max-width: 750px) {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    }
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
    cursor: pointer;
`;

const Title = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
`;

const ClaimPopup = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #111827;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 14px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    
`;

const SlotBox = styled.div`
    aspect-ratio: 1 / 1;
    background-color: #374151;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    contain: layout paint;
`;

const Img = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
    transition: transform 0.18s ease;
    will-change: transform;

    ${SlotBox}:hover & {
        transform: scale(1.05);
    }

    @media screen and (max-width: 750px) {
        transition: none;

        ${SlotBox}:hover & {
            transform: none;
        }
    }
`;

const PaginationRow = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
`;

const PageButton = styled.button`
    background: #1f2937;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 16px;
    cursor: pointer;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const PageText = styled.div`
    font-size: 14px;
    opacity: 0.85;
`;

export default function Gallery() {
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [info, setInfo] = useState<string | null>(null);

    const PHOTOS_PER_PAGE = 30;
    const [page, setPage] = useState(0);

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

    const allPhotos = useMemo(() => {
        return Object.entries(NAMES).sort(
            ([a], [b]) => Number(a.replace(".jpg", "")) - Number(b.replace(".jpg", ""))
        );
    }, []);

    const totalPages = Math.ceil(allPhotos.length / PHOTOS_PER_PAGE);

    const pagedPhotos = useMemo(() => {
        const start = page * PHOTOS_PER_PAGE;
        return allPhotos.slice(start, start + PHOTOS_PER_PAGE);
    }, [allPhotos, page]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [page]);

    const groupedResults = useMemo(() => {
        const groups: Record<string, number> = {};

        Object.values(NAMES).forEach((tag) => {
            if (query.trim()) {
                const people = tag.split("&").map((p) => p.trim());
                if (
                    !people.some((p) =>
                        p.toLowerCase().includes(query.toLowerCase())
                    )
                ) {
                    return;
                }
            }

            groups[tag] = (groups[tag] || 0) + 1;
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

            {!activeTag && !query.trim() && (
                <Grid>
                    {pagedPhotos.map(([filename, tag]) => {
                        const claim = claimedByFilename.get(filename);
                        return (
                            <SlotBox key={filename}>
                                <Img src={`/${filename}`} alt={tag} loading="lazy" decoding="async" />
                                {claim && (
                                    <Claimed
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setInfo(`Claimed by ${claim.email}`);
                                            setTimeout(() => setInfo(null), 2500);
                                        }}
                                    >
                                        Claimed
                                    </Claimed>
                                )}
                            </SlotBox>
                        );
                    })}
                </Grid>
            )}
            {totalPages > 1 && (
                <PaginationRow>
                    <PageButton
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                        ← Prev
                    </PageButton>

                    <PageText>
                        Page {page + 1} of {totalPages}
                    </PageText>

                    <PageButton
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                        Next →
                    </PageButton>
                </PaginationRow>
            )}

            {!activeTag && query.trim() && (
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
                                    <Img src={`/${filename}`} alt={tag} loading="lazy" decoding="async" />
                                    {claim && (
                                        <Claimed
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setInfo(`Claimed by ${claim.email}`);

                                                setTimeout(() => {
                                                    setInfo(null);
                                                }, 2500);
                                            }}
                                        >
                                            Claimed
                                        </Claimed>
                                    )}

                                </SlotBox>
                            );
                        })}
                    </Grid>
                </>
            )}
            {info && <ClaimPopup>{info}</ClaimPopup>}
        </Wrapper>
    );
}
