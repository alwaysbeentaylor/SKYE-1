import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIOS && !isInStandaloneMode) {
      // Show iOS install instructions after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } else {
      // iOS - just hide the prompt (user needs to use Safari menu)
      setShowPrompt(false);
    }
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50" style={{ animation: 'slide-up 0.3s ease-out' }}>
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl p-4 shadow-2xl border border-white/20 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg mb-1">
              Installeer SKYE als app
            </h3>
            {isIOS ? (
              <p className="text-white/90 text-sm mb-3">
                Tik op <span className="font-semibold">Deel</span> en selecteer{' '}
                <span className="font-semibold">Voeg toe aan beginscherm</span>
              </p>
            ) : (
              <p className="text-white/90 text-sm mb-3">
                Installeer SKYE voor snellere toegang en betere prestaties
              </p>
            )}
            <div className="flex gap-2">
              {!isIOS && (
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-sky-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-sky-50 transition-colors"
                >
                  Installeer nu
                </button>
              )}
              <button
                onClick={() => setShowPrompt(false)}
                className="bg-white/20 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-white/30 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

