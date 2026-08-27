// Ortak 'i' ipucu — Popover ile kısa açıklama. Davranış practitioner-panel'deki
// özgün sürümle birebir aynıdır.
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function InfoHint({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Bilgi"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-accent"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-xs leading-relaxed">{text}</PopoverContent>
    </Popover>
  );
}
