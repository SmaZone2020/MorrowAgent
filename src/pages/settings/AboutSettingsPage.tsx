import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";

const APP_VERSION = "0.1.0";
const STAGE = "阶段 0 · 垂直切片";

// Read-only facts about this build. Everything here is compiled in, so there is
// nothing to fetch and nothing to fail on.
export function AboutSettingsPage() {
  const rows = [
    { label: "版本", value: APP_VERSION },
    { label: "阶段", value: STAGE },
    { label: "运行时", value: "Tauri 2 · React 19" },
    { label: "界面", value: "BeUI · Gravity Icons" },
    { label: "本地数据", value: "SQLite + 加密凭证" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="关于 Morrow Agent"
        action={<InfoHint label="学习记录与凭证都留在本机，不上传任何自建服务。" />}
      >
        <dl className="flex flex-col gap-2.5 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 truncate text-right text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
