import { Link } from "react-router-dom";
import { Globe } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/vendor/beui/components/motion/popover-morph";
import { cn } from "@/vendor/beui/lib/utils";

/**
 * The search switch, next to the thinking switch in the composer.
 *
 * It is a per-question decision for the same reason thinking is: a question
 * about the textbook never needs the web, and every search is billed. Off is
 * not a mute button — the search tools are dropped from the request entirely,
 * so the model cannot spend a round discovering it is not allowed.
 *
 * Without a search key the control still opens, because a learner who cannot see
 * the switch would never learn that a key is what turns it on; the panel is then
 * one line and a link instead of two choices.
 */
export function SearchControl({
  enabled,
  ready,
  disabled,
  onChange,
}: {
  enabled: boolean;
  ready: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const on = enabled && ready;

  return (
    <MorphPopover>
      <MorphPopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={
            ready
              ? on
                ? "联网搜索：已开启"
                : "联网搜索：已关闭"
              : "联网搜索：还没有搜索密钥"
          }
          aria-pressed={on}
          title="联网搜索"
          disabled={disabled}
          className={cn(
            "h-8 shrink-0 gap-1.5 rounded-full px-2.5 text-sm",
            on && "bg-muted",
            !ready && "border border-dashed border-border",
          )}
        >
          <Globe
            className={cn(
              "size-4",
              on ? "text-foreground" : "text-muted-foreground",
            )}
          />
          <span className="text-muted-foreground">
            {ready ? (on ? "联网" : "不联网") : "未配置搜索"}
          </span>
        </Button>
      </MorphPopoverTrigger>

      <MorphPopoverContent
        side="top"
        align="start"
        sideOffset={8}
        radius={12}
        className="w-64 p-1.5"
      >
        {ready ? (
          [
            {
              value: true,
              label: "联网",
              hint: "教材没讲、需要最新信息时才去搜，按次计费。",
            },
            {
              value: false,
              label: "不联网",
              hint: "只用手里的文件和教材回答，不花搜索的钱。",
            },
          ].map((option) => {
            const active = option.value === on;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onChange(option.value)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors",
                  active ? "bg-muted" : "hover:bg-muted focus-visible:bg-muted",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col gap-1.5 px-2.5 py-2">
            <span className="text-sm text-foreground">还没有搜索密钥</span>
            <span className="text-sm leading-5 text-muted-foreground">
              联网搜索按次计费，用的是 DeepSeek 的 Key。
            </span>
            <Link
              to="/settings/search"
              className="text-sm text-foreground underline-offset-4 hover:underline"
            >
              去配置搜索
            </Link>
          </div>
        )}
      </MorphPopoverContent>
    </MorphPopover>
  );
}
