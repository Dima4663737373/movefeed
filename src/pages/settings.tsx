import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Head from "next/head";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import AuthGuard from "@/components/AuthGuard";
import LeftSidebar from "@/components/LeftSidebar";
import { getDisplayName, getAvatar } from "@/lib/microThreadsClient";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
    const { connected, account } = useWallet();
    const [userAddress, setUserAddress] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [avatar, setAvatar] = useState("");
    
    // Settings State
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(false);
    const [privacyMode, setPrivacyMode] = useState(false);
    const { language, setLanguage, t } = useLanguage();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (connected && account) {
            setUserAddress(account.address.toString());
            // Fetch profile
            getDisplayName(account.address.toString()).then(setDisplayName);
            getAvatar(account.address.toString()).then(setAvatar);
            
            // Fetch settings from Supabase
            if (supabase) {
                supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_address', account.address.toString())
                    .single()
                    .then(({ data, error }) => {
                        if (data) {
                            setNotificationsEnabled(data.notifications_enabled);
                            setEmailNotifications(data.email_notifications);
                            setPrivacyMode(data.privacy_mode);
                            if (data.language === 'en' || data.language === 'ua') {
                                setLanguage(data.language);
                            }
                        }
                    });
            }
        }
    }, [connected, account]);

    const handleSave = async () => {
        if (!account) return;
        setIsSaving(true);
        try {
            if (supabase) {
                const { error } = await supabase
                    .from('user_settings')
                    .upsert({
                        user_address: account.address.toString(),
                        notifications_enabled: notificationsEnabled,
                        email_notifications: emailNotifications,
                        privacy_mode: privacyMode,
                        language: language,
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;
                alert(t.settingsSaved);
            } else {
                 alert(t.settingsSavedLocally);
            }
        } catch (e) {
            console.error("Error saving settings", e);
            alert(t.settingsSaveError);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AuthGuard>
            <Head>
                <title>Settings - MoveFeed</title>
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
                            <ThemeSwitcher />
                            <WalletConnectButton />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-custom py-6 md:py-10">
                <div className="max-w-[1280px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-y-8 lg:gap-x-0 lg:divide-x lg:divide-[var(--card-border)]">
                        {/* Left Sidebar */}
                        <div className="lg:pr-6">
                            <LeftSidebar 
                                activePage="settings"
                                currentUserAddress={userAddress} 
                                displayName={displayName} 
                                avatar={avatar}
                            />
                        </div>

                        {/* Settings Content */}
                        <div className="lg:px-6 min-w-0">
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">{t.settings}</h1>

                        <div className="space-y-6">
                            {/* Notifications */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {t.notifications}
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{t.pushNotifications}</p>
                                            <p className="text-sm text-[var(--text-secondary)]">{t.pushNotificationsDesc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{t.emailNotifications}</p>
                                            <p className="text-sm text-[var(--text-secondary)]">{t.emailNotificationsDesc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    {t.privacy}
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{t.privateProfile}</p>
                                            <p className="text-sm text-[var(--text-secondary)]">{t.privateProfileDesc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={privacyMode} onChange={() => setPrivacyMode(!privacyMode)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Interface */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {t.interface}
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block font-medium text-[var(--text-primary)] mb-2">{t.language}</label>
                                        <select 
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value as 'en' | 'ua')}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                        >
                                            <option value="en">English</option>
                                            <option value="ua">Ukrainian</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-[var(--accent)] text-[var(--btn-text-primary)] font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isSaving ? t.saving : t.save}
                                </button>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </main>
        </AuthGuard>
    );
}
