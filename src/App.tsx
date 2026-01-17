import { useEffect, useState } from "react";
import styled from "styled-components";
import Rules from "./components/Rules";
import Scrolling from "./components/Scrolling";
import Rolls from "./components/Rolls";
import Claims from "./components/Claims";
import Gallery from "./components/Gallery";

const API = import.meta.env.VITE_API_URL as string;
type User = { id: number; email: string; name: string; picture?: string | null };

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
`;

const TopBar = styled.div`
    width: 100%;
    max-width: 1800px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
`;

const UserBox = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Avatar = styled.img`
    width: 34px;
    height: 34px;
    border-radius: 999px;
`;

export default function App() {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [view, setView] = useState<"rolls" | "claims" | "gallery">("rolls");

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
                <h1>Pasta Rolls</h1>
                <p>You must sign in to use the site.</p>
                <a href={`${API}/api/auth/google`}>
                    <Button style={{ backgroundColor: "white", color: "black" }}>
                        Sign in
                    </Button>
                </a>
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

                    <div style={{ display: "flex", gap: "12px" }}>
                        <Button onClick={() => setView("rolls")}>Rolls</Button>
                        <Button onClick={() => setView("claims")}>Claims</Button>
                        <Button onClick={() => setView("gallery")}>Gallery</Button>
                        <Button
                            onClick={async () => {
                                await fetch(`${API}/api/logout`, {
                                    method: "POST",
                                    credentials: "include"
                                });
                                setUser(null);
                            }}
                        style={{backgroundColor: "white", color: "black"}}>
                            Sign Out
                        </Button>
                    </div>
                </TopBar>

                {view === "rolls" ? (
                    <>
                        <Rolls />
                        <Rules />
                    </>
                ) : view === "claims" ? (
                    <Claims />
                ) : (
                    <Gallery />
                )}
            </Page>
        </>
    );
}
