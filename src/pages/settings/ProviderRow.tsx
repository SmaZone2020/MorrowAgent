import { Pencil, Play } from "@gravity-ui/icons";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

/**
 * One provider as a line in the list: identity, state and the actions.
 *
 * The actions are icon-only because both are single verbs with an obvious
 * picture — a triangle means "use this one", a pencil means "change it". The
 * slot where the triangle sits becomes the state once it has been pressed, so
 * the row never says "使用中" in one place and offers the button in another.
 */
export function ProviderRow({
  profile,
  activeModel,
  isActiveProvider,
  onActivate,
  onEdit,
}: {
  profile: StoredProviderProfile;
  activeModel: string | null;
  isActiveProvider: boolean;
  onActivate: () => void;
  onEdit: () => void;
}) {
  const model = isActiveProvider && activeModel ? activeModel : profile.models[0];
  const needsKey = profile.builtin && !profile.apiKey.trim();

  return (
    <div className="flex items-center gap-2 px-4 py-3.5">
      <span className="min-w-0 truncate text-sm font-medium text-foreground">
        {profile.name || "未命名供应商"}
      </span>

      {profile.builtin ? (
        <AnimatedBadge status="info" size="sm" contentKey="builtin">
          官方
        </AnimatedBadge>
      ) : null}

      {model ? (
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {prettyModelName(model)}
        </span>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {isActiveProvider ? (
          <AnimatedBadge status="success" size="sm" contentKey="active">
            已启用
          </AnimatedBadge>
        ) : (
          <Tooltip content={model ? "设为启用" : "先拉取模型"}>
            <Button
              size="sm"
              variant="ghost"
              aria-label="设为启用"
              className="size-8 rounded-lg p-0 text-sm"
              disabled={profile.models.length === 0}
              onClick={onActivate}
            >
              <Play className="size-4" />
            </Button>
          </Tooltip>
        )}

        <Tooltip content={needsKey ? "填写 Key" : "编辑"}>
          <Button
            size="sm"
            variant="ghost"
            aria-label={needsKey ? "填写 Key" : "编辑"}
            className="size-8 rounded-lg p-0 text-sm"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}


export interface PrettyModelNameOptions {
  separator?: string;
  acronyms?: readonly string[];
  preserve?: readonly string[];
}

const DEFAULT_ACRONYMS: readonly string[] = [
  'gpt',
  'glm',
  'llm',
  'ai',
  'api',
  'mcp',
  'nlp',
  'ocr',
  'tts',
  'stt',
  'vlm',
];

export function prettyModelName(
  name: string,
  options: PrettyModelNameOptions = {},
): string {
  const {
    separator = ' ',
    acronyms = DEFAULT_ACRONYMS,
    preserve = [],
  } = options;

  const raw = name.trim();
  if (!raw) return '';

  const acronymSet = new Set(acronyms.map((s) => s.toLowerCase()));
  const preserveMap = new Map(preserve.map((w) => [w.toLowerCase(), w]));

  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      const preserved = preserveMap.get(lower);
      if (preserved !== undefined) return preserved;
      if (acronymSet.has(lower)) return lower.toUpperCase();
      if (
        part.length > 1 &&
        part === part.toUpperCase() &&
        /[A-Z]/.test(part)
      ) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(separator);
}
