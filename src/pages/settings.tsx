import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/components/Notifications";
import Head from "next/head";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Toggle } from "@/components/Toggle";
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
    const [notifyTips, setNotifyTips] = useState(true);
    const [notifyErrors, setNotifyErrors] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [defaultTipAmount, setDefaultTipAmount] = useState("0.1");
    const [preferredExplorer, setPreferredExplorer] = useState("movement");
    const { language, setLanguage, t } = useLanguage();
    const { addNotification } = useNotifications();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (connected && account) {
            setUserAddress(account.address.toString());
            // Fetch profile
            getDisplayName(account.address.toString()).then(setDisplayName);
            getAvatar(account.address.toString()).then(setAvatar);
            
            // Load local settings
            const savedTip = localStorage.getItem('default_tip_amount');
            if (savedTip) setDefaultTipAmount(savedTip);

            const savedExplorer = localStorage.getItem('preferred_explorer');
            if (savedExplorer) setPreferredExplorer(savedExplorer);
            
            const savedSound = localStorage.getItem('sound_enabled');
            if (savedSound) setSoundEnabled(savedSound === 'true');

            const savedNotifyTips = localStorage.getItem('settings_notify_tips');
            if (savedNotifyTips) setNotifyTips(savedNotifyTips === 'true');

            const savedNotifyErrors = localStorage.getItem('settings_notify_errors');
            if (savedNotifyErrors) setNotifyErrors(savedNotifyErrors === 'true');

            // Fetch settings from Supabase (Language only mostly)
            if (supabase) {
                supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_address', account.address.toString())
                    .single()
                    .then(({ data, error }) => {
                        if (data) {
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
            // Save local settings
            localStorage.setItem('default_tip_amount', defaultTipAmount);
            localStorage.setItem('preferred_explorer', preferredExplorer);
            localStorage.setItem('sound_enabled', String(soundEnabled));
            localStorage.setItem('settings_notify_tips', String(notifyTips));
            localStorage.setItem('settings_notify_errors', String(notifyErrors));
            
            // Legacy/Compat
            localStorage.setItem('notifications_enabled', String(notifyTips));

            if (supabase) {
                const { error } = await supabase
                    .from('user_settings')
                    .upsert({
                        user_address: account.address.toString(),
                        notifications_enabled: notifyTips, // Map tips to general for now
                        email_notifications: false,
                        privacy_mode: false,
                        language: language,
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;
                
                // Show toast only
                addNotification(t.settingsSaved, 'success', { persist: false });
            } else {
                 addNotification(t.settingsSavedLocally, 'success', { persist: false });
            }
        } catch (e) {
            console.error("Error saving settings", e);
            addNotification(t.settingsSaveError, 'error', { persist: false });
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
                                <div className="space-y-2">
                                    <Toggle 
                                        checked={notifyTips} 
                                        onChange={setNotifyTips}
                                        label={t.notifyTips}
                                        description={t.notifyTipsDesc}
                                    />
                                    <div className="border-t border-[var(--card-border)] my-2"></div>
                                    <Toggle 
                                        checked={notifyErrors} 
                                        onChange={setNotifyErrors}
                                        label={t.notifyErrors}
                                        description={t.notifyErrorsDesc}
                                    />
                                    <div className="border-t border-[var(--card-border)] my-2"></div>
                                    <Toggle 
                                        checked={soundEnabled} 
                                        onChange={setSoundEnabled}
                                        label={t.soundEffects}
                                        description={t.soundDesc}
                                    />
                                </div>
                            </div>



                            {/* Tipping */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t.tipping}
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block font-medium text-[var(--text-primary)] mb-1">{t.defaultTipAmount}</label>
                                        <p className="text-sm text-[var(--text-secondary)] mb-2">{t.defaultTipDesc}</p>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                min="0.1"
                                                value={defaultTipAmount}
                                                onChange={(e) => setDefaultTipAmount(e.target.value)}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-4 pr-12 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="text-[var(--text-secondary)]">MOVE</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Explorer */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                    {t.explorerSettings}
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block font-medium text-[var(--text-primary)] mb-1">{t.preferredExplorer}</label>
                                        <p className="text-sm text-[var(--text-secondary)] mb-2">{t.preferredExplorerDesc}</p>
                                        <select 
                                            value={preferredExplorer}
                                            onChange={(e) => setPreferredExplorer(e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                        >
                                            <option value="movement">Movement Scan (Official)</option>
                                            <option value="aptos">Aptos Scan</option>
                                        </select>
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
