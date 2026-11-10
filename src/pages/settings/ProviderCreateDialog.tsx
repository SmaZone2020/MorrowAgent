import { useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { Modal } from "@/components/Modal";
import { ProtocolSelect } from "@/pages/settings/ProtocolSelect";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

export interface NewProviderValues {
  name: string;
  baseUrl: string;
  apiKey: string;
  protocol: NonNullable<StoredProviderProfile["protocol"]>;
}

/**
 * Creating a provider is a one-off decision, so it gets a modal instead of an
 * inline form: the list stays a list, and a half-filled card never sits in it.
 */
export function ProviderCreateDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: NewProviderValues) => void;
}) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [protocol, setProtocol] =
    useState<NonNullable<StoredProviderProfile["protocol"]>>("openai-chat");

  const canCreate = baseUrl.trim().length > 0;

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title="添加供应商"
      footer={
        <>
          <Button size="sm" variant="ghost" className="text-sm" onClick={onCancel}>
            取消
          </Button>
          <Button
            size="sm"
            className="text-sm"
            disabled={!canCreate}
            onClick={() =>
              onCreate({
                name: name.trim(),
                baseUrl: baseUrl.trim(),
                apiKey: apiKey.trim(),
                protocol,
              })
            }
          >
            添加
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="名称"
          value={name}
          onChange={setName}
          placeholder="例如：DeepSeek"
          autoComplete="off"
        />
        <Input
          label="Base URL"
          value={baseUrl}
          onChange={setBaseUrl}
          placeholder="https://api.example.com/v1"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="flex flex-col gap-2">
          <span className="px-1 text-sm font-medium text-foreground">协议</span>
          <ProtocolSelect value={protocol} onChange={setProtocol} />
        </div>
        <Input
          label="API Key"
          type="password"
          value={apiKey}
          onChange={setApiKey}
          placeholder="sk-..."
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </Modal>
  );
}
