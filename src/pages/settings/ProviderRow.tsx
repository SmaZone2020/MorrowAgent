import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

/**
 * One provider as a line in the list: identity, state and the one action. The
 * current model rides on the same line rather than under the name, so the row
 * stays a row.
 */
export function ProviderRow({
  profile,
  activeModel,
  isActiveProvider,
  onEdit,
}: {
  profile: StoredProviderProfile;
  activeModel: string | null;
  isActiveProvider: boolean;
  onEdit: () => void;
}) {
  const model = isActiveProvider && activeModel ? activeModel : profile.models[0];

  return (
    <div className="flex items-center gap-2 px-4 py-3.5">
      <span className="min-w-0 truncate text-sm font-medium text-foreground">
        {profile.name || "未命名供应商"}
      </span>
      {isActiveProvider ? (
        <AnimatedBadge status="success" size="sm" contentKey="active">
          使用中
        </AnimatedBadge>
      ) : null}
      {model ? (
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {model}
        </span>
      ) : null}

      <Button
        size="sm"
        variant="secondary"
        className="ml-auto shrink-0 text-sm"
        onClick={onEdit}
      >
        编辑
      </Button>
    </div>
  );
}
