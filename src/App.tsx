import { useEffect, useState } from "react";
import styled from "styled-components";
import Rules from "./components/Rules";
import Scrolling from "./components/Scrolling";
import Rolls from "./components/Rolls";

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

    useEffect(() => {
        fetch("http://localhost:3000/api/me", { credentials: "include" })
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
                <a href="http://localhost:3000/api/auth/google">
                    <Button>Sign in</Button>
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

                    <Button
                        onClick={async () => {
                            await fetch("http://localhost:3000/api/logout", {
                                method: "POST",
                                credentials: "include"
                            });
                            setUser(null);
                        }}
                    >
                        Sign out
                    </Button>
                </TopBar>

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
