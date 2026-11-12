import { useEffect, useState } from "react";
import { ArrowUpRightFromSquare, Globe } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import {
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";
import { openExternalUrl } from "@/features/rich/openExternal";
import { useSearchKey } from "@/features/settings/searchStore";

const PLATFORM_URL = "https://platform.deepseek.com/api_keys";

/** Money is returned as a decimal string, so it is shown as written. */
function formatBalance(infos: { currency: string; totalBalance: string }[]): string {
  if (infos.length === 0) return "—";
  return infos
    .map((info) => `${info.totalBalance} ${info.currency}`)
    .join(" · ");
}

/**
 * The DeepSeek credential web search runs on.
 *
 * It is its own page because it is its own purchase: Lumi's chat can run on any
 * OpenAI-compatible endpoint, while `web_search` and `fetch_page` bill DeepSeek
 * per call. The balance is the cheapest proof the key is live, so it is read
 * straight after saving rather than kept behind a "测试" button.
 */
export function SearchSettingsPage() {
  const ready = useSearchKey((state) => state.ready);
  const source = useSearchKey((state) => state.source);
  const checking = useSearchKey((state) => state.checking);
  const balance = useSearchKey((state) => state.balance);
  const error = useSearchKey((state) => state.error);
  const hydrate = useSearchKey((state) => state.hydrate);
  const saveKey = useSearchKey((state) => state.saveKey);
  const refreshBalance = useSearchKey((state) => state.refreshBalance);
  const clear = useSearchKey((state) => state.clear);

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Opening the page with a stored key asks for the balance once, which is what
  // turns the row from "已保存" into an actual amount.
  useEffect(() => {
    if (ready && !balance) void refreshBalance();
  }, [balance, ready, refreshBalance]);

  const save = async () => {
    const key = draft.trim();
    if (!key) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveKey(key);
      setDraft("");
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const forget = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await clear();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const available = balance?.isAvailable ?? false;

  return (
    <SettingsPageShell title="搜索与请求">
      <SettingsGroup title="DeepSeek">
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Globe aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">API Key</span>
            </div>
            {source === "search" ? (
              <AnimatedBadge status="success" size="sm">
                已配置
              </AnimatedBadge>
            ) : source === "provider" ? (
              <AnimatedBadge status="info" size="sm">
                复用供应商 Key
              </AnimatedBadge>
            ) : (
              <AnimatedBadge status="neutral" size="sm">
                未配置
              </AnimatedBadge>
            )}
          </div>

          <Input
            type="password"
            value={draft}
            onChange={setDraft}
            placeholder={
              source === "search"
                ? "已保存，输入新 Key 可替换"
                : "留空即用「AI 供应商」里的官方 Key"
            }
            spellCheck={false}
            autoComplete="off"
            classNames={{ field: "rounded-xl" }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="text-sm"
              disabled={saving || !draft.trim()}
              onClick={() => void save()}
            >
              {saving ? "保存中" : "保存"}
            </Button>
            {source === "search" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-destructive"
                disabled={saving}
                onClick={() => void forget()}
              >
                清除
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => void openExternalUrl(PLATFORM_URL)}
            >
              DeepSeek 开放平台
              <ArrowUpRightFromSquare className="size-4" />
            </Button>
          </div>

          {source === "provider" ? (
            <p className="text-sm leading-6 text-muted-foreground">
              正在复用「AI 供应商」里官方 DeepSeek 的 Key，那边改一次即可。
            </p>
          ) : null}

          {saveError ? (
            <p className="text-sm leading-6 text-destructive">{saveError}</p>
          ) : null}
        </div>
      </SettingsGroup>

      <SettingsGroup title="账户">
        <SettingsRow
          title="余额"
          hint="每次网页搜索按次计费，余额在后面这里读。"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {!ready
                ? "未配置"
                : checking
                  ? "读取中"
                  : balance
                    ? formatBalance(balance.balanceInfos)
                    : "—"}
            </span>
          }
        />
        <SettingsRow
          title="状态"
          control={
            <AnimatedBadge
              status={!ready ? "neutral" : available ? "success" : "warning"}
              size="sm"
            >
              {!ready ? "未配置" : available ? "可用" : "余额不足或不可用"}
            </AnimatedBadge>
          }
        />
        {error ? (
          <SettingsRow
            title="上一次读取"
            control={
              <span className="max-w-72 truncate text-sm text-destructive">
                {error}
              </span>
            }
          />
        ) : null}
      </SettingsGroup>
    </SettingsPageShell>
  );
}
