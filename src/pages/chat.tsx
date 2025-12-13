/**
 * Chat Page
 * 
 * Messaging and chat features
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import AuthGuard from "@/components/AuthGuard";
import LeftSidebar from "@/components/LeftSidebar";
import { getDisplayName, getAvatar, OnChainPost, getGlobalPostsCount, getAllPostsPaginated } from "@/lib/microThreadsClient";
import { formatMovementAddress } from "@/lib/movement";

interface Message {
    id: string;
    sender: string;
    receiver: string;
    content: string;
    timestamp: number;
    read: boolean;
}

interface Conversation {
    contact: string;
    lastMessage: Message;
}

interface Profile {
    displayName?: string;
    avatar?: string;
}

export default function ChatPage() {
    const { account, connected, signMessage } = useWallet();
    const router = useRouter();
    const userAddress = account?.address.toString() || "";
    const [myDisplayName, setMyDisplayName] = useState("");
    const [myAvatar, setMyAvatar] = useState("");
    
    // Chat State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeContact, setActiveContact] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [isLoading, setIsLoading] = useState(false);
    
    // New Chat State
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [following, setFollowing] = useState<string[]>([]);
    const [allUsers, setAllUsers] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<{
        following: string[];
        global: string[];
    }>({ following: [], global: [] });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Handle URL query for starting a chat
    useEffect(() => {
        if (router.query.user) {
            setActiveContact(router.query.user as string);
        }
    }, [router.query.user]);

    // Load own profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (connected && userAddress) {
                try {
                    const name = await getDisplayName(userAddress);
                    const avatar = await getAvatar(userAddress);
                    setMyDisplayName(name);
                    setMyAvatar(avatar);
                } catch (err) {
                    console.error('Failed to load profile', err);
                }
            }
        };
        fetchProfile();
    }, [connected, userAddress]);

    // Load Conversations
    const fetchConversations = async () => {
        if (!userAddress) return;
        try {
            const res = await fetch(`/api/messages?user=${userAddress}`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
                
                // Fetch profiles for contacts
                const contacts = data.map((c: Conversation) => c.contact);
                fetchProfiles(contacts);
            }
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        }
    };

    // Load Messages for Active Contact
    const fetchMessages = async () => {
        if (!userAddress || !activeContact) return;
        try {
            const res = await fetch(`/api/messages?user=${userAddress}&otherUser=${activeContact}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    };

    const markConversationAsRead = async (contact: string) => {
        if (!userAddress || !contact) return;
        
        try {
             const messagePayload = {
                user: userAddress,
                otherUser: contact,
                timestamp: Date.now()
            };
            const messageString = JSON.stringify(messagePayload);

            const response = await signMessage({
                message: messageString,
                nonce: Date.now().toString(),
            });

            let signatureToSend: any = response;
            
            // Handle object wrapper
            if (typeof response === 'object' && response !== null) {
                if ('signature' in response) {
                    signatureToSend = (response as any).signature;
                }
                if (typeof signatureToSend === 'object' && signatureToSend && 'data' in (signatureToSend as any)) {
                    signatureToSend = (signatureToSend as any).data;
                }
            }

            if (Array.isArray(signatureToSend) || signatureToSend instanceof Uint8Array || (typeof signatureToSend === 'object' && signatureToSend !== null && Object.values(signatureToSend).every((v: any) => typeof v === 'number'))) {
                 const bytes = Array.isArray(signatureToSend) ? signatureToSend : 
                               (signatureToSend instanceof Uint8Array ? signatureToSend : Object.values(signatureToSend));
                 signatureToSend = "0x" + Array.from(bytes as any[]).map((b: any) => b.toString(16).padStart(2, '0')).join('');
            }

            await fetch('/api/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageString,
                    signature: signatureToSend,
                    publicKey: account?.publicKey
                })
            });
        } catch (e) {
            console.error("Failed to mark conversation as read", e);
        }
    };

    // Helper to fetch profiles
    const fetchProfiles = async (addresses: string[]) => {
        const newProfiles: Record<string, Profile> = { ...profiles };
        let hasUpdates = false;

        await Promise.all(addresses.map(async (addr) => {
            if (!newProfiles[addr]) {
                try {
                    const displayName = await getDisplayName(addr);
                    const avatar = await getAvatar(addr);
                    newProfiles[addr] = { displayName, avatar };
                    hasUpdates = true;
                } catch (e) {
                    console.error(`Failed to fetch profile for ${addr}`, e);
                }
            }
        }));

        if (hasUpdates) {
            setProfiles(newProfiles);
        }
    };

    // Polling
    useEffect(() => {
        if (connected && userAddress) {
            fetchConversations();
            const interval = setInterval(fetchConversations, 5000);
            return () => clearInterval(interval);
        }
    }, [connected, userAddress]);

    useEffect(() => {
        if (connected && userAddress && activeContact) {
            fetchMessages();
            fetchProfiles([activeContact]);
            
            // Mark as read when entering chat
            // We removed the automatic signature request to improve UX.
            // Messages will be marked as read when the user replies.
            // markConversationAsRead(activeContact);

            const interval = setInterval(fetchMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [connected, userAddress, activeContact]);

    // Load data for new chat (Following list and All Users)
    useEffect(() => {
        if (isNewChatOpen && userAddress) {
            // Fetch Following
            fetch(`/api/follow?targetAddress=${userAddress}&includeLists=true`)
                .then(res => res.json())
                .then(data => {
                    setFollowing(data.following || []);
                    // Pre-load profiles for following
                    fetchProfiles(data.following || []);
                })
                .catch(err => console.error("Failed to fetch following", err));

            // Fetch All Users (from posts) - optimize by fetching only recent posts
            getGlobalPostsCount()
                .then(async (count) => {
                    const LIMIT = 100; // Look at last 100 posts to find active users
                    const start = Math.max(0, count - LIMIT);
                    return await getAllPostsPaginated(start, LIMIT);
                })
                .then(posts => {
                    const uniqueCreators = Array.from(new Set(posts.map(p => p.creator)));
                    setAllUsers(uniqueCreators);
                    // Pre-load profiles for some users (first 10 maybe)
                    fetchProfiles(uniqueCreators.slice(0, 10));
                })
                .catch(err => console.error("Failed to fetch all users", err));
        }
    }, [isNewChatOpen, userAddress]);

    // Handle Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ following: following, global: [] });
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();

        // Filter Following
        const matchedFollowing = following.filter(addr => {
            const profile = profiles[addr];
            const nameMatch = profile?.displayName?.toLowerCase().includes(lowerQuery);
            const addrMatch = addr.toLowerCase().includes(lowerQuery);
            return nameMatch || addrMatch;
        });

        // Filter Global (excluding following)
        const matchedGlobal = allUsers.filter(addr => {
            if (following.includes(addr)) return false; // Already in following
            const profile = profiles[addr];
            const nameMatch = profile?.displayName?.toLowerCase().includes(lowerQuery);
            const addrMatch = addr.toLowerCase().includes(lowerQuery);
            return nameMatch || addrMatch;
        });

        setSearchResults({ following: matchedFollowing, global: matchedGlobal });
        
        // Fetch profiles for matches to ensure names are displayed
        const allMatches = [...matchedFollowing, ...matchedGlobal];
        if (allMatches.length > 0) {
            fetchProfiles(allMatches.slice(0, 20)); // Limit fetching
        }
    }, [searchQuery, following, allUsers, profiles]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeContact || !userAddress) return;

        const content = inputText.trim();

        try {
            const messagePayload = {
                sender: userAddress,
                receiver: activeContact,
                content,
                timestamp: Date.now()
            };
            const messageString = JSON.stringify(messagePayload);

            const response = await signMessage({
                message: messageString,
                nonce: Date.now().toString(),
            });

            let signatureToSend: any = response;
            
            // Handle object wrapper
            if (typeof response === 'object' && response !== null) {
                if ('signature' in response) {
                    signatureToSend = (response as any).signature;
                }
                
                // Handle nested data object
                if (typeof signatureToSend === 'object' && signatureToSend && 'data' in (signatureToSend as any)) {
                    signatureToSend = (signatureToSend as any).data;
                }
            }

            // Handle Uint8Array or Array
            if (Array.isArray(signatureToSend) || signatureToSend instanceof Uint8Array || (typeof signatureToSend === 'object' && signatureToSend !== null && Object.values(signatureToSend).every((v: any) => typeof v === 'number'))) {
                 // Convert to hex string
                 const bytes = Array.isArray(signatureToSend) ? signatureToSend : 
                               (signatureToSend instanceof Uint8Array ? signatureToSend : Object.values(signatureToSend));
                 signatureToSend = "0x" + Array.from(bytes as any[]).map((b: any) => b.toString(16).padStart(2, '0')).join('');
            }

            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageString,
                    signature: signatureToSend,
                    publicKey: account?.publicKey
                })
            });

            if (res.ok) {
                setInputText("");
                fetchMessages();
                fetchConversations();
            } else {
                console.error("Failed to send message", await res.text());
            }
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    const startNewChat = (address: string) => {
        if (address.trim()) {
            setActiveContact(address.trim());
            setIsNewChatOpen(false);
            setSearchQuery("");
        }
    };

    return (
        <AuthGuard>
            <Head>
                <title>Chat - MoveFeed</title>
            </Head>

            <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)] sticky top-0 z-40 transition-colors duration-300">
                <div className="container-custom py-6">
                    <div className="max-w-[1280px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/feed'}>
                            <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center shadow-lg">
                                <span className="text-black font-bold text-xl">M</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">MOVEFEED</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <WalletConnectButton />
                            <ThemeSwitcher />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-custom py-6 md:py-10 h-[calc(100vh-100px)]">
                <div className="max-w-[1280px] mx-auto h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_350px_1fr] h-full gap-y-8 lg:gap-x-0 lg:divide-x lg:divide-[var(--card-border)]">
                        {/* LEFT SIDEBAR (Nav) */}
                        <div className="hidden lg:block lg:pr-6">
                            <LeftSidebar activePage="chat" currentUserAddress={userAddress} displayName={myDisplayName} avatar={myAvatar} />
                        </div>

                        {/* MIDDLE: Conversations List */}
                        <div className={`flex flex-col h-full bg-[var(--bg-primary)] lg:px-6 ${activeContact ? 'hidden xl:flex' : 'flex'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Messages</h2>
                                <button 
                                    onClick={() => setIsNewChatOpen(true)}
                                    className="p-2 bg-[var(--accent)] text-black rounded-full hover:opacity-90 transition-opacity"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {conversations.length === 0 ? (
                                    <div className="text-center py-10 text-[var(--text-secondary)]">
                                        <p>No conversations yet</p>
                                        <button 
                                            onClick={() => setIsNewChatOpen(true)}
                                            className="mt-4 text-[var(--accent)] hover:underline"
                                        >
                                            Start a new chat
                                        </button>
                                    </div>
                                ) : (
                                    conversations.map(conv => {
                                        const profile = profiles[conv.contact];
                                        const isSelected = activeContact === conv.contact;
                                        return (
                                            <button
                                                key={conv.contact}
                                                onClick={() => setActiveContact(conv.contact)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                                                    isSelected ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20' : 'hover:bg-[var(--hover-bg)]'
                                                }`}
                                            >
                                                <div className="w-12 h-12 rounded-full bg-[var(--card-border)] flex-shrink-0 overflow-hidden">
                                                    {profile?.avatar ? (
                                                        <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] font-bold">
                                                            {profile?.displayName?.[0]?.toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className={`font-bold truncate ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                                                            {profile?.displayName || formatMovementAddress(conv.contact)}
                                                        </span>
                                                        <span className="text-xs text-[var(--text-secondary)]">
                                                            {new Date(conv.lastMessage.timestamp).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm truncate ${conv.lastMessage.read || conv.lastMessage.sender === userAddress ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] font-bold'}`}>
                                                        {conv.lastMessage.sender === userAddress ? 'You: ' : ''}{conv.lastMessage.content}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Chat Window */}
                        <div className={`flex flex-col h-full lg:px-6 ${!activeContact ? 'hidden xl:flex xl:items-center xl:justify-center' : 'flex'}`}>
                            {!activeContact ? (
                                <div className="text-center text-[var(--text-secondary)]">
                                    <div className="w-20 h-20 bg-[var(--card-border)] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-xl font-bold">Select a conversation</p>
                                    <p>Choose a contact to start chatting</p>
                                </div>
                            ) : (
                                <>
                                    {/* Chat Header */}
                                    <div className="flex items-center gap-3 pb-4 border-b border-[var(--card-border)] mb-4">
                                        <button 
                                            onClick={() => setActiveContact(null)}
                                            className="xl:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-[var(--card-border)] overflow-hidden">
                                            {profiles[activeContact]?.avatar ? (
                                                <img src={profiles[activeContact].avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] font-bold">
                                                    {profiles[activeContact]?.displayName?.[0]?.toUpperCase() || "U"}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)]">
                                                {profiles[activeContact]?.displayName || formatMovementAddress(activeContact)}
                                            </h3>
                                            <p className="text-xs text-[var(--text-secondary)] font-mono">
                                                {activeContact}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                                        {messages.map((msg, idx) => {
                                            const isMe = msg.sender === userAddress;
                                            return (
                                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                                                        isMe 
                                                            ? 'bg-[var(--accent)] text-black rounded-tr-none' 
                                                            : 'bg-[var(--card-border)] text-[var(--text-primary)] rounded-tl-none'
                                                    }`}>
                                                        <p>{msg.content}</p>
                                                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-black/60' : 'text-[var(--text-secondary)]'}`}>
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <form onSubmit={handleSendMessage} className="relative">
                                        <input
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Type a message..."
                                            className="w-full bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!inputText.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-bg)] rounded-full transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* New Chat Modal */}
                {isNewChatOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-[var(--text-primary)]">New Message</h3>
                                <button 
                                    onClick={() => setIsNewChatOpen(false)}
                                    className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors"
                                >
                                    <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="mb-4">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users..."
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    autoFocus
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {/* Following Section */}
                                {searchResults.following.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Following</h4>
                                        {searchResults.following.map(addr => (
                                            <button
                                                key={addr}
                                                onClick={() => startNewChat(addr)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--hover-bg)] rounded-xl transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-[var(--card-border)] flex-shrink-0 overflow-hidden">
                                                    {profiles[addr]?.avatar ? (
                                                        <img src={profiles[addr].avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] font-bold">
                                                            {profiles[addr]?.displayName?.[0]?.toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-bold text-[var(--text-primary)] block truncate">
                                                        {profiles[addr]?.displayName || formatMovementAddress(addr)}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-secondary)] truncate">
                                                        {addr}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Global Section */}
                                {searchResults.global.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Other Users</h4>
                                        {searchResults.global.map(addr => (
                                            <button
                                                key={addr}
                                                onClick={() => startNewChat(addr)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--hover-bg)] rounded-xl transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-[var(--card-border)] flex-shrink-0 overflow-hidden">
                                                    {profiles[addr]?.avatar ? (
                                                        <img src={profiles[addr].avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] font-bold">
                                                            {profiles[addr]?.displayName?.[0]?.toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-bold text-[var(--text-primary)] block truncate">
                                                        {profiles[addr]?.displayName || formatMovementAddress(addr)}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-secondary)] truncate">
                                                        {addr}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {searchResults.following.length === 0 && searchResults.global.length === 0 && (
                                    <div className="text-center text-[var(--text-secondary)] py-8">
                                        <p>No users found</p>
                                        {searchQuery && searchQuery.startsWith("0x") && searchQuery.length > 10 && (
                                            <button
                                                onClick={() => startNewChat(searchQuery)}
                                                className="mt-2 text-[var(--accent)] hover:underline"
                                            >
                                                Chat with {formatMovementAddress(searchQuery)}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </AuthGuard>
    );
}
