import { Button } from "@/vendor/beui/components/motion/button";
import { Modal } from "@/components/Modal";
import { BuiltinProviderEditor } from "@/pages/settings/BuiltinProviderEditor";
import { ProviderEditor, type TestState } from "@/pages/settings/ProviderEditor";
import type { StoredProviderProfile } from "@/features/settings/providerStore";

/**
 * Editing is a modal rather than an unfolded row: the fields are the same
 * width as the create form, and the list keeps its shape while a provider is
 * being changed.
 *
 * The builtin DeepSeek provider gets a shorter body — its endpoint and protocol
 * are not choices — and it cannot be deleted, because Lumi needs some endpoint
 * to answer at all.
 */
export function ProviderEditDialog({
  profile,
  activeModel,
  isActiveProvider,
  test,
  busy,
  canRemove,
  onClose,
  onChange,
  onFetchModels,
  onUseModel,
  onRemove,
}: {
  profile: StoredProviderProfile;
  activeModel: string | null;
  isActiveProvider: boolean;
  test: TestState;
  busy: boolean;
  canRemove: boolean;
  onClose: () => void;
  onChange: (patch: Partial<StoredProviderProfile>) => void;
  onFetchModels: () => void;
  onUseModel: (model: string) => void;
  onRemove: () => void;
}) {
  const builtin = profile.builtin === true;

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={profile.name || "未命名供应商"}
      width="lg"
      footer={
        <>
          {canRemove && !builtin ? (
            <Button
              size="sm"
              variant="ghost"
              className="mr-auto text-sm text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              删除
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" className="text-sm" onClick={onClose}>
            完成
          </Button>
        </>
      }
    >
      {builtin ? (
        <BuiltinProviderEditor
          profile={profile}
          activeModel={activeModel}
          isActiveProvider={isActiveProvider}
          test={test}
          busy={busy}
          onChange={onChange}
          onFetchModels={onFetchModels}
          onUseModel={onUseModel}
        />
      ) : (
        <ProviderEditor
          profile={profile}
          activeModel={activeModel}
          isActiveProvider={isActiveProvider}
          test={test}
          busy={busy}
          onChange={onChange}
          onFetchModels={onFetchModels}
          onUseModel={onUseModel}
        />
      )}
    </Modal>
  );
}
