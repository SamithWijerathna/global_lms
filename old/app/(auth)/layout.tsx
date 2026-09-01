import "@/styles/globals.css";

import { ThemeSwitch } from "@/components/theme-switch";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
           {children}

            <div className=" absolute bottom-5 right-5">
                <ThemeSwitch />
            </div>
        </>
    );
}
