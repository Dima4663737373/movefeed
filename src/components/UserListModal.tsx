import { useState, useEffect } from "react";
import { getDisplayName, getAvatar } from "@/lib/microThreadsClient";
import UserSuggestion from "./UserSuggestion";

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    users: string[]; // List of addresses
    currentUserAddress: string;
}

export default function UserListModal({ isOpen, onClose, title, users, currentUserAddress }: UserListModalProps) {
    const [profiles, setProfiles] = useState<Record<string, { displayName: string, avatar: string }>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && users.length > 0) {
            setLoading(true);
            const fetchProfiles = async () => {
                const newProfiles: Record<string, any> = { ...profiles };
                let hasUpdates = false;

                await Promise.all(users.map(async (address) => {
                    if (newProfiles[address]) return;
                    
                    try {
                        const [name, avatar] = await Promise.all([
                            getDisplayName(address),
                            getAvatar(address)
                        ]);
                        newProfiles[address] = { displayName: name, avatar };
                        hasUpdates = true;
                    } catch (e) {
                        console.error(`Failed to fetch profile for ${address}`, e);
                        newProfiles[address] = { displayName: "", avatar: "" };
                        hasUpdates = true;
                    }
                }));

                if (hasUpdates) {
                    setProfiles(newProfiles);
                }
                setLoading(false);
            };
            fetchProfiles();
        }
    }, [isOpen, users]); 

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar flex-1">
                    {loading && Object.keys(profiles).length === 0 ? (
                         <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
                         </div>
                    ) : users.length === 0 ? (
                        <p className="text-center text-[var(--text-secondary)] py-4">No users found.</p>
                    ) : (
                        users.map(user => (
                            <UserSuggestion
                                key={user}
                                creator={user}
                                currentUserAddress={currentUserAddress}
                                profile={profiles[user] || { displayName: "", avatar: "" }}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
