import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { protocolLabel } from "@/pages/settings/ProtocolSelect";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

/** One provider as a line in the list: identity on the left, actions right. */
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
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {profile.name || "未命名供应商"}
          </span>
          {isActiveProvider ? (
            <AnimatedBadge status="success" size="sm" contentKey="active">
              使用中
            </AnimatedBadge>
          ) : null}
          <AnimatedBadge
            status="neutral"
            size="sm"
            contentKey={profile.protocol ?? "openai-chat"}
          >
            {protocolLabel(profile.protocol)}
          </AnimatedBadge>
        </div>
        <span className="truncate font-mono text-sm text-muted-foreground">
          {profile.baseUrl || "未填写地址"}
        </span>
        <span className="text-sm text-muted-foreground">
          {isActiveProvider && activeModel
            ? activeModel
            : profile.models[0] ?? "还没有模型"}
          {profile.models.length > 0 ? ` · ${profile.models.length} 个模型` : ""}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="secondary" className="text-sm" onClick={onEdit}>
          编辑
        </Button>
      </div>
    </div>
  );
}
