import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useConfirmStore } from '../store/useConfirmStore';
import { usePWAStore } from '../store/usePWAStore';

export function useSettingsPage() {
  const { currentUser, userProfile, logout, linkCouple, updateUserProfile } = useAuthStore();
  const { confirm, close, setLoading: setConfirmLoading } = useConfirmStore();
  const { deferredPrompt, setDeferredPrompt, isInstalled, setIsInstalled } = usePWAStore();

  // Deteksi iOS yang benar: cek iPad/iPhone/iPod, BUKAN 'Safari' (ada di Android UA juga!)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallApp = async () => {
    // Android (dan browser lain): gunakan native install prompt
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
      return;
    }

    // Fallback: tampilkan panduan manual sesuai platform
    if (!isInstalled) {
      const message = isIOS
        ? 'Untuk menginstall di iOS:\n1. Tap ikon Share (□↑) di browser\n2. Pilih "Add to Home Screen"\n3. Tap "Add" untuk konfirmasi'
        : 'Untuk menginstall di Android:\n1. Buka menu browser (titik tiga ⋮)\n2. Pilih "Install app" atau "Add to Home Screen"';

      confirm({
        title: '📱 Install CandyNest',
        message,
        confirmText: 'Mengerti',
        variant: 'info',
        onConfirm: () => close(),
      });
    }
  };


  // Invite & Link State
  const [inviteCode, setInviteCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.displayName || '');
  const [editGender, setEditGender] = useState(userProfile?.gender || 'male');
  const [saving, setSaving] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Telegram bot recovery: token stays in component memory and is cleared after each attempt.
  const [telegramToken, setTelegramToken] = useState('');
  const [configuringTelegram, setConfiguringTelegram] = useState(false);
  const [telegramSetupError, setTelegramSetupError] = useState('');
  const [telegramSetupSuccess, setTelegramSetupSuccess] = useState('');

  const handleTelegramWebhookRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !telegramToken.trim()) return;

    setConfiguringTelegram(true);
    setTelegramSetupError('');
    setTelegramSetupSuccess('');
    try {
      const configureWebhook = httpsCallable<
        { botToken: string },
        { botUsername: string; webhookUrl: string }
      >(functions, 'configureTelegramWebhook');
      const result = await configureWebhook({ botToken: telegramToken.trim() });
      const configured = result.data;
      setTelegramSetupSuccess(`Webhook aktif untuk @${configured.botUsername}.`);
    } catch (err: any) {
      setTelegramSetupError(err.message || 'Gagal memulihkan koneksi Telegram.');
    } finally {
      setTelegramToken('');
      setConfiguringTelegram(false);
    }
  };

  const copyCode = async () => {
    if (userProfile?.inviteCode) {
      try {
        await navigator.clipboard.writeText(userProfile.inviteCode);
      } catch (error) {
        console.error('Gagal menyalin kode undangan:', error);
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inviteCode) return;
    setLinking(true);
    setLinkError('');
    setLinkSuccess('');
    try {
      await linkCouple(inviteCode.toUpperCase().trim());
      setLinkSuccess('Berhasil terhubung!');
      setInviteCode('');
    } catch (err: any) {
      setLinkError(err.message || 'Gagal menghubungkan');
    } finally {
      setLinking(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    setUpdateError('');
    try {
      await updateUserProfile({
        displayName: editName,
        gender: editGender as 'male' | 'female'
      });
      setIsEditing(false);
    } catch (err: any) {
      setUpdateError(err.message || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    confirm({
      title: 'Keluar Aplikasi',
      message: 'Apakah Anda yakin ingin keluar?',
      onConfirm: async () => {
        setConfirmLoading(true);
        await logout();
        close();
      }
    });
  };

  return {
    userProfile,
    isEditing,
    setIsEditing,
    editName,
    setEditName,
    editGender,
    setEditGender,
    saving,
    updateError,
    telegramToken,
    setTelegramToken,
    configuringTelegram,
    telegramSetupError,
    telegramSetupSuccess,
    handleTelegramWebhookRestore,
    inviteCode,
    setInviteCode,
    linking,
    linkError,
    linkSuccess,
    copied,
    copyCode,
    handleLink,
    handleUpdateProfile,
    handleLogout,
    handleInstallApp,
    isInstalled,
    // Tampilkan tombol install jika: ada native prompt ATAU device iOS yang belum install
    // Android tanpa deferredPrompt = tombol tidak muncul (event belum/tidak dipicu browser)
    canInstall: !!deferredPrompt || (isIOS && !isInstalled)
  };
}
