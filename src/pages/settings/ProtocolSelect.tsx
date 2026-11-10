import type { ComponentType, SVGProps } from "react";
import { Comment, Sparkles, Terminal } from "@gravity-ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/vendor/beui/components/motion/select";
import type { Protocol } from "@/features/settings/aiBridge";

export interface ProtocolOption {
  value: Protocol;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** The three wire formats, each with a glyph so the choice reads at a glance. */
export const PROTOCOLS: ProtocolOption[] = [
  { value: "openai-chat", label: "Chat", icon: Comment },
  { value: "openai-responses", label: "Responses", icon: Terminal },
  { value: "anthropic", label: "Anthropic", icon: Sparkles },
];

export function protocolLabel(value: Protocol | undefined): string {
  return PROTOCOLS.find((entry) => entry.value === value)?.label ?? "Chat";
}

/**
 * A protocol picker. `SelectValue` only prints a string label, so the trigger
 * renders the current option itself: icon plus name, matching the panel rows.
 */
export function ProtocolSelect({
  value,
  onChange,
}: {
  value: Protocol;
  onChange: (next: Protocol) => void;
}) {
  const current = PROTOCOLS.find((entry) => entry.value === value) ?? PROTOCOLS[0]!;
  const CurrentIcon = current.icon;

  return (
    <Select value={value} onValueChange={(next) => onChange(next as Protocol)}>
      <SelectTrigger className="rounded-xl">
        <span className="flex items-center gap-2 text-foreground">
          <CurrentIcon aria-hidden="true" className="size-4 shrink-0" />
          {current.label}
        </span>
      </SelectTrigger>
      <SelectContent>
        {PROTOCOLS.map((entry) => {
          const Icon = entry.icon;
          return (
            <SelectItem key={entry.value} value={entry.value}>
              <span className="flex items-center gap-2">
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {entry.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
