import { Input } from "@/vendor/beui/components/motion/input";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Switch } from "@/vendor/beui/components/motion/switch";
import { InfoHint } from "@/components/InfoHint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/vendor/beui/components/motion/select";
import { ProtocolSelect } from "@/pages/settings/ProtocolSelect";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

export type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; count: number }
  | { status: "error"; message: string };

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
}

// The expanded body of one provider. The API key is a password field with no
// reveal: it is the one value here that is never shown back to the user.
export function ProviderEditor({
  profile,
  activeModel,
  isActiveProvider,
  test,
  busy,
  onChange,
  onFetchModels,
  onUseModel,
}: ProviderEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="名称"
          value={profile.name}
          onChange={(name) => onChange({ name })}
          placeholder="例如：DeepSeek"
          autoComplete="off"
        />
        <Input
          label="Base URL"
          value={profile.baseUrl}
          onChange={(baseUrl) => onChange({ baseUrl })}
          placeholder="https://api.example.com/v1"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">协议</span>
        <ProtocolSelect
          value={profile.protocol ?? "openai-chat"}
          onChange={(protocol) => onChange({ protocol })}
        />
      </div>

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
          disabled={busy || !profile.baseUrl.trim() || !profile.apiKey.trim()}
          onClick={onFetchModels}
        >
          {test.status === "testing" ? "拉取中" : "拉取模型"}
        </Button>
        {test.status === "ok" ? (
          <AnimatedBadge status="success" size="sm" contentKey={test.count}>
            {test.count} 个
          </AnimatedBadge>
        ) : null}
        {profile.models.length > 0 ? (
          <AnimatedBadge
            status="neutral"
            size="sm"
            contentKey={profile.models.length}
          >
            {profile.models.length} 个已存
          </AnimatedBadge>
        ) : null}
      </div>
      {test.status === "error" ? (
        <p className="text-sm leading-6 text-destructive">{test.message}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
          模型
          <InfoHint label="从「拉取模型」得到的列表里选一个；选中即切换到这个供应商。" />
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
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
          支持视觉
          <InfoHint label="关闭后不再上传图片；文档仍会抽取文字发送。" />
        </span>
        <Switch
          checked={profile.supportsVision !== false}
          onCheckedChange={(supportsVision) => onChange({ supportsVision })}
          ariaLabel="支持视觉"
        />
      </div>
    </div>
  );
}
