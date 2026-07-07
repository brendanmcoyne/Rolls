import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { NAMES } from "../data/photoNames";

const API = "";

type Claim = {
    id: number;
    filename: string;
    email: string;
};

type MyClaim = {
    id: number;
    filename: string;
    claimed_at: string;
};

type User = {
    id: number;
    email: string;
    name: string;
};

const Page = styled.div`
    max-width: 1200px;
    margin: 0 auto;
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
        grid-template-columns: repeat(2, minmax(200px, 1fr));
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
        grid-template-columns: repeat(2, minmax(200px, 1fr));
    }
`;

const BadgeRow = styled.div`
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
`;

const Claimed = styled.div<{ $mine?: boolean }>`
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: ${({ $mine }) => ($mine ? "#16a34a" : "#ffbf1f")};
    color: white;
    opacity: 0.9;
    cursor: pointer;
`;

const TradeButton = styled.button`
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    background: #dc2626;
    color: white;
    border: none;
    cursor: pointer;
    opacity: 0.9;

    &:hover {
        opacity: 1;
    }
`;

const Title = styled.h1`
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
    font-size: clamp(3rem, 9vw, 7rem);
    line-height: 0.95;
    letter-spacing: -0.08em;
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

const Button = styled.button`
    padding: 10px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    background-color: #111827;
    color: #dddddd;

    @media screen and (max-width: 750px) {
        padding: 10px;
        font-size: 14px;
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

const OfferGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
    max-height: 320px;
    overflow-y: auto;
`;

const OfferCard = styled.button<{ $selected?: boolean }>`
    background: #1f2937;
    border: 3px solid ${({ $selected }) => ($selected ? "#3b82f6" : "transparent")};
    border-radius: 12px;
    padding: 6px;
    cursor: pointer;
    color: white;
    text-align: center;
`;

const OfferImg = styled.img`
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 8px;
    display: block;
`;

const OfferName = styled.div`
    font-size: 13px;
    margin-top: 6px;
`;

export default function Gallery({ user }: { user: User }) {
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [info, setInfo] = useState<string | null>(null);
    const [claimedOnly, setClaimedOnly] = useState(false);

    const [myClaims, setMyClaims] = useState<MyClaim[]>([]);
    const [tradeTarget, setTradeTarget] = useState<Claim | null>(null);
    const [offeredPhotoId, setOfferedPhotoId] = useState<number | null>(null);

    const PHOTOS_PER_PAGE = 40;
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

    const visiblePhotos = useMemo(() => {
        if (!claimedOnly) return allPhotos;

        return allPhotos.filter(([filename]) => claimedByFilename.has(filename));
    }, [allPhotos, claimedOnly, claimedByFilename]);

    const totalPages = Math.ceil(visiblePhotos.length / PHOTOS_PER_PAGE);

    const pagedPhotos = useMemo(() => {
        const start = page * PHOTOS_PER_PAGE;
        return visiblePhotos.slice(start, start + PHOTOS_PER_PAGE);
    }, [visiblePhotos, page]);

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

    async function openTrade(claim: Claim) {
        const res = await fetch(`${API}/api/my-claims`, {
            credentials: "include",
        });

        const data = await res.json();

        setMyClaims(data.cards ?? []);
        setTradeTarget(claim);
        setOfferedPhotoId(null);
    }

    async function sendTrade() {
        if (!tradeTarget || !offeredPhotoId) return;

        const res = await fetch(`${API}/api/trades`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                requestedPhotoId: tradeTarget.id,
                offeredPhotoId,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            setInfo(data.error ?? "Could not send trade");
            return;
        }

        setTradeTarget(null);
        setInfo("Trade request sent!");
        setTimeout(() => setInfo(null), 2500);
    }

    return (
        <Page>
            <Title>Gallery</Title>
            <SearchRow>
                <Search
                    placeholder="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </SearchRow>

            <SearchRow>
                <Button
                    type="button"
                    onClick={() => {
                        setClaimedOnly((v) => !v);
                        setPage(0);
                    }}
                    style={{
                        backgroundColor: claimedOnly ? "white" : "#1f2937",
                        color: claimedOnly ? "black" : "white",
                    }}
                >
                    {claimedOnly ? "Show All Photos" : "Show Claimed Photos"}
                </Button>
            </SearchRow>

            {!query.trim() && totalPages > 1 && (
                <PaginationRow style={{marginBottom: "20px"}}>
                    <PageButton disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</PageButton>
                    <PageText>Page {page + 1} of {totalPages}</PageText>
                    <PageButton disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next →</PageButton>
                </PaginationRow>
            )}

            {!activeTag && !query.trim() && (
                <Grid>
                    {pagedPhotos.map(([filename, tag]) => {
                        const claim = claimedByFilename.get(filename);
                        return (
                            <SlotBox key={filename}>
                                <Img src={`/${filename}`} alt={tag} loading="lazy" decoding="async" />
                                {claim && (
                                    <BadgeRow>
                                        <Claimed
                                            $mine={claim.email === user.email}
                                            onClick={(e) => {
                                                e.stopPropagation();

                                                if (claim.email === user.email) {
                                                    setInfo("Claimed by you!");
                                                } else {
                                                    setInfo(`Claimed by: ${claim.email}`);
                                                }

                                                setTimeout(() => setInfo(null), 2500);
                                            }}
                                        >
                                            Claimed
                                        </Claimed>

                                        {claim.email !== user.email && (
                                            <TradeButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTrade(claim);
                                                }}
                                            >
                                                Trade
                                            </TradeButton>
                                        )}
                                    </BadgeRow>
                                )}
                            </SlotBox>
                        );
                    })}
                </Grid>
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
                                        <BadgeRow>
                                            <Claimed
                                                $mine={claim.email === user.email}
                                                onClick={(e) => {
                                                    e.stopPropagation();

                                                    if (claim.email === user.email) {
                                                        setInfo("Claimed by you!");
                                                    } else {
                                                        setInfo(`Claimed by: ${claim.email}`);
                                                    }

                                                    setTimeout(() => setInfo(null), 2500);
                                                }}
                                            >
                                                Claimed
                                            </Claimed>

                                            {claim.email !== user.email && (
                                                <TradeButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openTrade(claim);
                                                    }}
                                                >
                                                    Trade
                                                </TradeButton>
                                            )}
                                        </BadgeRow>
                                    )}

                                </SlotBox>
                            );
                        })}
                    </Grid>
                </>
            )}
            {info && <ClaimPopup>{info}</ClaimPopup>}

            {tradeTarget && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2000,
                    }}
                    onClick={() => setTradeTarget(null)}
                >
                    <div
                        style={{
                            background: "#111827",
                            padding: 24,
                            borderRadius: 16,
                            width: "90%",
                            maxWidth: 500,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2>Send Trade Request</h2>

                        <p>
                            You want:{" "}
                            <strong>{NAMES[tradeTarget.filename] ?? tradeTarget.filename}</strong>
                        </p>

                        <p>Choose one of your photos to offer:</p>
                        <OfferGrid>
                            {myClaims.map((claim) => (
                                <OfferCard
                                    key={claim.id}
                                    type="button"
                                    $selected={offeredPhotoId === claim.id}
                                    onClick={() => setOfferedPhotoId(claim.id)}
                                >
                                    <OfferImg
                                        src={`/${claim.filename}`}
                                        alt={NAMES[claim.filename] ?? claim.filename}
                                    />
                                    <OfferName>{NAMES[claim.filename] ?? "Unknown"}</OfferName>
                                </OfferCard>
                            ))}
                        </OfferGrid>

                        <button disabled={!offeredPhotoId} onClick={sendTrade}>
                            Send Trade
                        </button>

                        <button onClick={() => setTradeTarget(null)} style={{ marginLeft: 8 }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Page>
    );
}
