import { Button } from "@/components/ui/button";
import { coachShortcuts } from "@/data/coach";
import { t } from "@/i18n";

export function CoachStarterChips({ onSelect }: { onSelect: (prompt: string) => void }) {
  return <div className="flex flex-wrap gap-2">
    {coachShortcuts.map((shortcut) => <Button key={shortcut.id} type="button" variant="ghost"
      onClick={() => onSelect(shortcut.prompt)} className="btn-secondary learning-control h-auto whitespace-normal rounded-full py-2 text-left text-sm">
      {t(`pass3.shortcuts.${shortcut.id}`)}
    </Button>)}
  </div>;
}