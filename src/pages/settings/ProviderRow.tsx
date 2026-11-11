import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { InfoHint } from "@/components/InfoHint";
import { protocolLabel } from "@/pages/settings/ProtocolSelect";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

/**
 * One provider as a line in the list: identity, state and the one action. The
 * address and the current model are details, so they sit behind the INFO button
 * instead of taking a second and third line under the name.
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
  const detail = [
    profile.baseUrl || "未填写地址",
    model ? `模型 ${model}` : "还没有模型",
  ].join(" · ");

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
      <AnimatedBadge
        status="neutral"
        size="sm"
        contentKey={profile.protocol ?? "openai-chat"}
      >
        {protocolLabel(profile.protocol)}
      </AnimatedBadge>
      <InfoHint label={detail} />

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
