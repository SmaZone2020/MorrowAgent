import { useEffect, useState } from "react";
import { ArrowRight } from "@gravity-ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Input } from "@/vendor/beui/components/motion/input";
import { Modal } from "@/components/Modal";
import { InfoHint } from "@/components/InfoHint";
import { LumiMood } from "@/features/lumi/LumiMood";
import { PersonaPicker } from "@/features/lumi/PersonaPicker";
import { asPersona } from "@/features/lumi/persona";
import {
  asTeachingStyle,
  TEACHING_STYLES,
  TEACHING_STYLE_LABEL,
} from "@/features/lumi/teachingStyle";
import { ChoiceTabs } from "@/pages/settings/SettingsBlocks";
import { usePreferences } from "@/features/settings/preferencesStore";
import { ageFrom } from "@/features/settings/birthday";
import {
  PackageDropZone,
  isArchive,
  pickArchive,
  useArchiveDrop,
} from "@/features/library/PackageDropZone";
import { fileName, usePackageInstall } from "@/features/library/usePackageInstall";
import { ProviderQuickSetup } from "@/features/onboarding/ProviderQuickSetup";

/** The four questions a first launch asks, in the order they have to be asked. */
export const ONBOARDING_STEPS = [
  "welcome",
  "provider",
  "style",
  "package",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const TITLES: Record<OnboardingStep, string> = {
  welcome: "欢迎使用 Morrow",
  provider: "连接DeepSeek服务",
  style: "Lumi 的风格",
  package: "导入学习包",
};

/**
 * Setup cannot be dismissed, so the only thing to do with a close request is
 * ignore it.
 *
 * It has to be one stable function rather than an inline arrow: the modal's
 * focus effect depends on this callback, and a new identity on every render
 * would re-run that effect and pull focus back to the first control — which,
 * on the style step, meant every keystroke in the nickname field jumped the
 * caret into the persona cards.
 */
const IGNORE_CLOSE = () => undefined;

/**
 * The first launch, as four screens inside one modal.
 *
 * It exists because an empty shelf is not self-explanatory: without a key Lumi
 * cannot answer, and without a package there is nothing to answer about. The
 * order is the dependency order of the app itself.
 *
 * The flow cannot be dismissed — no skip button, no Escape, no backdrop press,
 * no corner close. A first run is the one screen where the learner has nothing
 * to go back to, so an exit would only lead to an empty shelf and the same
 * question asked again. Individual fields may be left blank; the steps may not.
 *
 * Each step does its own work rather than pointing at the page that owns it. A
 * link to settings or to the import dialog would make the wizard a table of
 * contents: the learner would leave, configure one field, and come back to a
 * flow that has forgotten where it was. So the key field and the file slot are
 * the reduced versions of those screens, and the full editors stay one click
 * away for everything the shortcut does not cover.
 *
 * Everything asked here is about the person, never about a book. The learning
 * goal belongs to one package and is set on that package's plan page after the
 * first diagnostic, where it can be read against real answers. Installing a
 * package here therefore does nothing else: it lands on the shelf, and the
 * learner decides when to start working.
 */
export function OnboardingDialog({
  open,
  step,
  onStep,
  providerConfigured,
  onFinish,
}: {
  open: boolean;
  step: OnboardingStep;
  onStep: (step: OnboardingStep) => void;
  providerConfigured: boolean;
  /** The last button: setup is over, and the caller takes it from there. */
  onFinish: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  // The provider step holds 「下一步」 until a key has been proven to work. That
  // is the one hard gate in the flow: everything else can be answered with a
  // blank field, but a key that has never listed a model means Lumi cannot
  // answer at all, and letting the learner through would only hide that.
  const [providerReady, setProviderReady] = useState(false);
  const reduce = useReducedMotion() ?? false;
  const { phase, start, reset } = usePackageInstall();

  // The style answers are global, so they are written straight to preferences
  // as they are given. A learner who leaves mid-step keeps what they already
  // chose instead of losing it with the modal.
  const persona = usePreferences((state) => state.persona);
  const teachingStyle = usePreferences((state) => state.teachingStyle);
  const nickname = usePreferences((state) => state.nickname);
  const birthday = usePreferences((state) => state.birthday);
  const update = usePreferences((state) => state.update);
  const age = ageFrom(birthday);

  const accept = (path: string) => {
    if (!isArchive(path)) {
      setHint(`只能导入 .morrow 或 .7z 文件，选中的是 ${fileName(path)}`);
      return;
    }
    setHint(null);
    setPicked(path);
    void start(path);
  };

  const dragging = useArchiveDrop(open && step === "package", accept);

  // A fresh open starts from a clean form; paging back and forth does not.
  useEffect(() => {
    if (open) setProviderReady(false);
  }, [open]);

  const index = ONBOARDING_STEPS.indexOf(step);
  const last = index === ONBOARDING_STEPS.length - 1;
  // The import step holds the flow while a package is being read.
  const busy = phase.kind === "checking" || phase.kind === "installing";
  // An already-working provider needs no proof from this run.
  const providerDone = providerConfigured || providerReady;
  const blocked = step === "provider" && !providerDone;

  const next = () => {
    if (last) {
      onFinish();
      return;
    }
    onStep(ONBOARDING_STEPS[index + 1]!);
  };

  return (
    <Modal
      open={open}
      onOpenChange={IGNORE_CLOSE}
      title={TITLES[step]}
      width="lg"
      dismissible={false}
      footer={
        <>
          {index > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              className="mr-auto text-sm"
              disabled={busy}
              onClick={() => onStep(ONBOARDING_STEPS[index - 1]!)}
            >
              上一步
            </Button>
          ) : null}
          <Button
            size="sm"
            className="text-sm"
            disabled={busy || blocked}
            onClick={next}
          >
            {last ? "完成初始化" : "下一步"}
            {last ? null : <ArrowRight className="size-4" />}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {ONBOARDING_STEPS.map((entry, position) => (
            <div
              key={entry}
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted"
            >
              <motion.div
                initial={false}
                animate={{ scaleX: position <= index ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 260, damping: 30 }
                }
                className="h-full w-full origin-left rounded-full bg-foreground/70"
              />
            </div>
          ))}
        </div>

        {step === "welcome" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <LumiMood state="happy" surface="card" className="size-28" />
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              我是 Lumi。这里按学习包划分：一个包是一本书，有它自己的对话、错题本和画像。先花一分钟，把三件事准备好。
            </p>
          </div>
        ) : step === "provider" ? (
          <ProviderQuickSetup onReady={setProviderReady} />
        ) : step === "style" ? (
          <div className="flex flex-col gap-5">
            <PersonaPicker
              value={asPersona(persona)}
              onChange={(entry) => update({ persona: entry })}
            />

            {/* Method next to voice: both are about Lumi, both are global, and
                a learner choosing one is already thinking about the other. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  讲解方式
                </span>
                <InfoHint label="先问后讲会先确认你卡在哪一步；直接讲解给结论和完整过程；只提问不直接给答案。" />
              </div>
              <ChoiceTabs
                label="讲解方式"
                options={TEACHING_STYLES.map((entry) => ({
                  value: entry,
                  label: TEACHING_STYLE_LABEL[entry],
                }))}
                value={asTeachingStyle(teachingStyle)}
                onChange={(entry) => update({ teachingStyle: entry })}
              />
            </div>

            <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
              <Input
                label="Lumi 怎么称呼你"
                value={nickname}
                onChange={(value) => update({ nickname: value.slice(0, 24) })}
                placeholder="留空就用「你」"
                classNames={{ field: "rounded-xl", input: "text-sm" }}
              />
              <Input
                label="出生日期（可跳过）"
                type="date"
                value={birthday}
                onChange={(value) => update({ birthday: value })}
                classNames={{
                  field: "rounded-xl",
                  input: "text-sm tabular-nums",
                }}
              />
            </div>

            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              {age === null
                ? "这些只影响 Lumi 的语气和称呼，随时可以在设置里改。"
                : `按 ${age} 岁来挑例子和用词；随时可以在设置里改。`}
              <InfoHint label="出生日期只用来大致判断该用什么例子和大概的学习年级，不会传给学习包之外的东西。" />
            </p>
          </div>
        ) : (
          <PackageDropZone
            file={picked}
            dragging={dragging}
            hint={hint}
            busy={busy}
            onPick={() => {
              void pickArchive().then((path) => {
                if (path) accept(path);
              });
            }}
            footer={
              phase.kind === "checking" ? (
                <AnimatedBadge status="loading" size="sm" contentKey="checking">
                  正在校验 {fileName(phase.file)}
                </AnimatedBadge>
              ) : phase.kind === "installing" ? (
                <AnimatedBadge status="loading" size="sm" contentKey="installing">
                  正在安装 {phase.name}
                </AnimatedBadge>
              ) : phase.kind === "done" ? (
                <AnimatedBadge status="success" size="sm" contentKey="installed">
                  已加入书架，点「完成初始化」结束
                </AnimatedBadge>
              ) : phase.kind === "failed" ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm leading-6 text-destructive">
                    {phase.reason}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-sm"
                    onClick={() => {
                      reset();
                      setPicked(null);
                    }}
                  >
                    重试
                  </Button>
                </div>
              ) : null
            }
          />
        )}
      </div>
    </Modal>
  );
}
