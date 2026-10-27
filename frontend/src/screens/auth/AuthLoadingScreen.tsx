import { useLanguage } from '@/contexts/LanguageContext';

export function AuthLoadingScreen() {
  const { pick } = useLanguage();
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-headline-md text-headline-md text-on-surface">{pick('Nepal Civic', 'नेपाल सिभिक')}</p>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">{pick('Checking your session…', 'सत्र जाँच हुँदैछ…')}</p>
      </div>
    </div>
  );
}
