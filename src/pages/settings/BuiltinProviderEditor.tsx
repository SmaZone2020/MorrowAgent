import { useEffect } from "react";
import { ArrowRotateLeft, Wallet } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/vendor/beui/components/motion/select";
import { InfoHint } from "@/components/InfoHint";
import type { TestState } from "@/pages/settings/ProviderEditor";
import type { StoredProviderProfile } from "@/features/settings/providerStore";
import { useSearchKey } from "@/features/settings/searchStore";
import { prettyModelName } from "@/pages/settings/ProviderRow";

/**
 * The builtin DeepSeek provider.
 *
 * Deliberately short. Every other provider needs a name, a base URL and a
 * protocol because those are choices; DeepSeek's are not — the app knows the
 * endpoint and the protocol, so the only things worth asking for are the key,
 * the models the key unlocks, and which one Lumi should think with.
 */
export function BuiltinProviderEditor({
  profile,
  activeModel,
  isActiveProvider,
  test,
  busy,
  onChange,
  onFetchModels,
  onUseModel,
}: {
  profile: StoredProviderProfile;
  activeModel: string | null;
  isActiveProvider: boolean;
  test: TestState;
  busy: boolean;
  onChange: (patch: Partial<StoredProviderProfile>) => void;
  onFetchModels: () => void;
  onUseModel: (model: string) => void;
}) {
  const balance = useSearchKey((state) => state.balance);
  const checking = useSearchKey((state) => state.checking);
  const refreshBalance = useSearchKey((state) => state.refreshBalance);

  // The editor is modal, so asking for the balance on open is the only moment
  // it is worth a request; the search page reads the same store.
  useEffect(() => {
    if (profile.apiKey.trim()) void refreshBalance();
  }, [profile.apiKey, refreshBalance]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <Input
          label="API Key"
          type="password"
          value={profile.apiKey}
          onChange={(apiKey) => onChange({ apiKey })}
          placeholder="sk-..."
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <Button
          size="sm"
          variant="secondary"
          className="mb-1.5 shrink-0 text-sm"
          disabled={busy || !profile.apiKey.trim()}
          onClick={onFetchModels}
        >
          {test.status === "testing" ? "拉取中" : "拉取模型"}
        </Button>
      </div>
      {test.status === "error" ? (
        <p className="text-sm leading-6 text-destructive">{test.message}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
          模型
          <InfoHint label="从「拉取模型」得到的列表里选一个；选中即切换到这个供应商。" />
        </span>
        <Select
          value={isActiveProvider ? (activeModel ?? "") : (profile.models[0] ?? "")}
          onValueChange={onUseModel}
          disabled={profile.models.length === 0}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="先拉取模型" />
          </SelectTrigger>
          <SelectContent>
            {profile.models.map((model) => (
              <SelectItem key={model} value={model}>
                {prettyModelName(model)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
          余额
          <InfoHint label="DeepSeek 按量计费，这里读的是当前账户余额。" />
        </span>
        <span className="flex items-center gap-2">
          <Wallet aria-hidden="true" className="size-4 text-muted-foreground" />
          <span className="text-sm tabular-nums text-foreground">
            {!profile.apiKey.trim()
              ? "未配置"
              : checking
                ? "读取中"
                : balance
                  ? balance.balanceInfos
                      .map((info) => `${info.totalBalance} ${info.currency}`)
                      .join(" · ") || "—"
                  : "—"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label="刷新余额"
            className="size-8 rounded-lg p-0"
            disabled={busy || checking || !profile.apiKey.trim()}
            onClick={() => void refreshBalance()}
          >
            <ArrowRotateLeft className="size-4" />
          </Button>
        </span>
      </div>
    </div>
  );
}
