import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
import { SubjectBook } from "@/features/knowledge/SubjectBook";
import { subjects } from "@/features/knowledge/subjects";
import { rememberSubject } from "@/features/knowledge/recentSubjects";

/**
 * The training centre opens on a shelf, not on a mode picker: choosing a
 * subject is the decision that everything else depends on (D-078).
 */
export function TrainingShelfPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  const open = (subjectId: string) => {
    rememberSubject(subjectId);
    const subject = subjects.find((entry) => entry.id === subjectId);
    if (!subject || subject.questionCount === 0) {
      // An empty shelf card should say so instead of opening a blank drill.
      setNotice(`${subject?.name ?? "该科目"}还没有题目，先去知识库看看。`);
      return;
    }
    navigate(`/training/drill?subject=${subjectId}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="训练中心"
        action={<InfoHint label="先选科目，再进入该科目的专项训练。" />}
      >
        {subjects.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            知识库里还没有任何科目内容。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {subjects.map((subject) => (
              <SubjectBook
                key={subject.id}
                subject={subject}
                onOpen={() => open(subject.id)}
              />
            ))}
          </div>
        )}
        {notice ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{notice}</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-sm"
              onClick={() => navigate("/knowledge")}
            >
              去知识库
            </Button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
