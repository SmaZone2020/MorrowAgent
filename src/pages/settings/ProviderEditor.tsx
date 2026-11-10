import { Input } from "@/vendor/beui/components/motion/input";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/vendor/beui/components/motion/select";
import { InfoHint } from "@/components/InfoHint";
import type { Protocol } from "@/features/settings/aiBridge";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

export type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; count: number }
  | { status: "error"; message: string };

const PROTOCOLS: { value: Protocol; label: string }[] = [
  { value: "openai-chat", label: "Chat" },
  { value: "openai-responses", label: "Responses" },
  { value: "anthropic", label: "Anthropic" },
];

export interface ProviderEditorProps {
  profile: StoredProviderProfile;
  /** The model this provider currently sends requests to, if it is active. */
  activeModel: string | null;
  isActiveProvider: boolean;
  test: TestState;
  busy: boolean;
  onChange: (patch: Partial<StoredProviderProfile>) => void;
  onFetchModels: () => void;
  onUseModel: (model: string) => void;
  onRemove: () => void;
  /** Hidden for the last remaining provider: there must be somewhere to send. */
  canRemove: boolean;
}

// One card per provider. The API key is a password field with no reveal: it is
// the one value on this page that is never shown back to the user.
export function ProviderEditor({
  profile,
  activeModel,
  isActiveProvider,
  test,
  busy,
  onChange,
  onFetchModels,
  onUseModel,
  onRemove,
  canRemove,
}: ProviderEditorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 p-3">
      <div className="flex items-center gap-2">
        <Input
          label="名称"
          value={profile.name}
          onChange={(name) => onChange({ name })}
          placeholder="例如：DeepSeek"
          autoComplete="off"
        />
        <div className="flex shrink-0 items-end gap-1 pb-0.5">
          {isActiveProvider ? (
            <AnimatedBadge status="success" size="sm" contentKey="active">
              使用中
            </AnimatedBadge>
          ) : null}
          {canRemove ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-sm"
              onClick={onRemove}
            >
              删除
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">协议</span>
        <div className="flex flex-wrap gap-2">
          {PROTOCOLS.map((entry) => (
            <Button
              key={entry.value}
              size="sm"
              variant={profile.protocol === entry.value ? "primary" : "secondary"}
              className="text-sm"
              onClick={() => onChange({ protocol: entry.value })}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      </div>

      <Input
        label="Base URL"
        value={profile.baseUrl}
        onChange={(baseUrl) => onChange({ baseUrl })}
        placeholder="https://api.example.com/v1"
        spellCheck={false}
        autoComplete="off"
      />
      <Input
        label="API Key"
        type="password"
        value={profile.apiKey}
        onChange={(apiKey) => onChange({ apiKey })}
        placeholder="sk-..."
        spellCheck={false}
        autoComplete="off"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="text-sm"
          disabled={
            busy || !profile.baseUrl.trim() || !profile.apiKey.trim()
          }
          onClick={onFetchModels}
        >
          {test.status === "testing" ? "拉取中" : "拉取模型"}
        </Button>
        <span className="text-sm text-muted-foreground">
          已存 {profile.models.length} 个模型
        </span>
        {test.status === "ok" ? (
          <span className="text-sm text-success">
            拉取成功，返回 {test.count} 个
          </span>
        ) : null}
      </div>
      {test.status === "error" ? (
        <p className="text-sm leading-6 text-destructive">{test.message}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
          模型
          <InfoHint label="从「拉取模型」得到的列表里选一个；列表为空时先在供应商侧拉取。" />
        </span>
        {profile.models.length > 0 ? (
          <Select
            value={isActiveProvider ? activeModel ?? "" : profile.models[0]}
            onValueChange={onUseModel}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {profile.models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            还没有模型，先点「拉取模型」。
          </p>
        )}
        {isActiveProvider ? (
          <span className="text-sm text-muted-foreground">
            当前请求使用这个模型。
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            选一个模型即切换到该供应商。
          </span>
        )}
      </div>
    </div>
  );
}
