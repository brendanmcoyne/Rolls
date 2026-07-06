import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import Rules from "./components/Rules";
import Scrolling from "./components/Scrolling";
import Rolls from "./components/Rolls";
import Claims from "./components/Claims";
import Gallery from "./components/Gallery";
import Trades from "./components/Trades";

const API = "";

type User = {
    id: number;
    email: string;
    name: string;
    picture?: string | null;
};

const moveLeftToRight = keyframes`
    from {
        transform: translateX(-50%);
    }
    to {
        transform: translateX(0);
    }
`;

const moveRightToLeft = keyframes`
    from {
        transform: translateX(0);
    }
    to {
        transform: translateX(-50%);
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

const LoginPage = styled.div`
    min-height: 100vh;
    width: 100%;
    background-color: #111827;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 16px;
    position: relative;
    overflow: hidden;
`;

const PhotoBackdrop = styled.div`
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 42px;

    &::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 3;
        background:
                radial-gradient(
                        circle at center,
                        rgba(17, 24, 39, 0.2),
                        rgba(17, 24, 39, 0.2)
                ),
                linear-gradient(
                        to bottom,
                        rgba(17, 24, 39, 0.2),
                        rgba(17, 24, 39, 0.2),
                        rgba(17, 24, 39, 0.2)
                );
    }
`;

const PhotoRow = styled.div<{ $tilt: "top" | "bottom" }>`
    width: 100vw;
    overflow: hidden;
    transform: ${({ $tilt }) => ($tilt === "top" ? "rotate(-0deg)" : "rotate(0deg)")};
`;

const PhotoTrack = styled.div<{ $direction: "leftToRight" | "rightToLeft" }>`
    display: flex;
    width: max-content;
    gap: 22px;
    animation: ${({ $direction }) =>
    $direction === "leftToRight" ? moveLeftToRight : moveRightToLeft}
        42s linear infinite;
`;

const FloatingPhoto = styled.img`
    width: clamp(330px, 11vw, 490px);
    height: clamp(330px, 11vw, 490px);
    border-radius: 999px;
    object-fit: cover;
    object-position: center;
    flex: 0 0 auto;
    opacity: 1;
    border: 3px solid rgba(255, 255, 255, 0.90);
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.90);
    @media screen and (max-width: 750px) {
        width: clamp(200px, 11vw, 300px);
        height: clamp(200px, 11vw, 300px);
    }
`;

const LoginContent = styled.div`
    position: relative;
    z-index: 2;
    text-align: center;
    padding: 34px 42px;
    border-radius: 24px;
    background: rgba(17, 24, 39, 0.68);
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);

    @media screen and (max-width: 750px) {
        padding: 26px 24px;
        width: min(92vw, 420px);
    }
`;

const LoginTitle = styled.h1`
    margin: 0;
    font-size: clamp(3rem, 9vw, 7rem);
    line-height: 0.95;
    letter-spacing: -0.08em;
    text-transform: uppercase;
`;

const LoginText = styled.p`
    margin: 16px 0 22px;
    font-size: clamp(1rem, 2vw, 1.25rem);
    color: #e5e7eb;
`;

const Button = styled.button`
    padding: 10px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    background-color: #111827;
    color: #dddddd;

    &:hover {
        text-decoration: underline;
    }

    &:focus {
        outline: none;
    }

    @media screen and (max-width: 750px) {
        padding: 6px 8px;
        font-size: 12px;
    }
`;

const SignInButton = styled(Button)`
    background-color: white;
    color: black;
    font-size: 16px;
    padding: 12px 20px;

    @media screen and (max-width: 750px) {
        font-size: 14px;
        padding: 10px 16px;
    }
`;

const NavButtons = styled.div`
    display: flex;
    gap: 12px;

    @media screen and (max-width: 750px) {
        width: 100%;
        justify-content: center;
        gap: 6px;
        flex-wrap: wrap;
    }
`;

const TopBar = styled.div`
    width: 100%;
    max-width: 1800px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;

    @media screen and (max-width: 750px) {
        justify-content: center;
    }
`;

const UserBox = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;

    @media screen and (max-width: 750px) {
        display: none;
    }
`;

const Avatar = styled.img`
    width: 34px;
    height: 34px;
    border-radius: 999px;
`;

type MovingPhoto = {
    filename: string;
};

function getRandomPhotoRows() {
    const photos: MovingPhoto[] = Array.from({ length: 560 }, (_, index) => ({
        filename: `${index + 1}.jpg`
    }));

    for (let i = photos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [photos[i], photos[j]] = [photos[j], photos[i]];
    }

    const picked = photos.slice(0, 20);

    return {
        top: picked.slice(0, 10),
        bottom: picked.slice(10, 20)
    };
}

function MovingPhotoRows() {
    const { top, bottom } = useMemo(() => getRandomPhotoRows(), []);

    const renderRow = (photos: MovingPhoto[]) => (
        <>
            {[...photos, ...photos].map((photo, index) => (
                <FloatingPhoto
                    key={`${photo.filename}-${index}`}
                    src={`/${photo.filename}`}
                    alt=""
                />
            ))}
        </>
    );

    return (
        <PhotoBackdrop aria-hidden="true">
            <PhotoRow $tilt="top">
                <PhotoTrack $direction="leftToRight">{renderRow(top)}</PhotoTrack>
            </PhotoRow>

            <PhotoRow $tilt="bottom">
                <PhotoTrack $direction="rightToLeft">{renderRow(bottom)}</PhotoTrack>
            </PhotoRow>
        </PhotoBackdrop>
    );
}

export default function App() {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [view, setView] = useState<"rolls" | "claims" | "gallery" | "trades">("rolls");

    useEffect(() => {
        fetch(`${API}/api/me`, { credentials: "include" })
            .then((res) => (res.status === 401 ? null : res.json()))
            .then(setUser)
            .catch(() => setUser(null));
    }, []);

    if (user === undefined) {
        return <LoginPage>Loading...</LoginPage>;
    }

    if (user === null) {
        return (
            <LoginPage>
                <MovingPhotoRows />

                <LoginContent>
                    <LoginTitle>Pasta Rolls</LoginTitle>
                    <LoginText>Click to log in!</LoginText>

                    <a href={`${API}/api/auth/google`}>
                        <SignInButton>Sign in</SignInButton>
                    </a>
                </LoginContent>
            </LoginPage>
        );
    }

    return (
        <>
            <Scrolling />

            <Page>
                <TopBar>
                    <UserBox>
                        {user.picture && <Avatar src={user.picture} alt={user.name} />}
                        <div>{user.name}</div>
                    </UserBox>

                    <NavButtons>
                        <Button onClick={() => setView("rolls")}>Roll</Button>
                        <Button onClick={() => setView("claims")}>Claims</Button>
                        <Button onClick={() => setView("gallery")}>Gallery</Button>
                        <Button onClick={() => setView("trades")}>Trades</Button>

                        <Button
                            onClick={async () => {
                                await fetch(`${API}/api/logout`, {
                                    method: "POST",
                                    credentials: "include"
                                });

                                setUser(null);
                            }}
                            style={{ backgroundColor: "white", color: "black" }}
                        >
                            Sign Out
                        </Button>
                    </NavButtons>
                </TopBar>

                {view === "rolls" ? (
                    <>
                        <Scrolling />
                        <Rolls />
                        <Rules />
                    </>
                ) : view === "claims" ? (
                    <Claims />
                ) : view === "gallery" ? (
                    <Gallery user={user} />
                ) : (
                    <Trades />
                )}
            </Page>
        </>
    );
}