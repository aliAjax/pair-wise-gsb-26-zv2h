import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const project = {
  "id": "hxwl-12",
  "port": 5112,
  "title": "心理咨询个案记录",
  "subtitle": "会谈时间线、风险等级与干预目标记录",
  "stack": "React + Vite + TypeScript + CSS",
  "theme": [
    "#7c3aed",
    "#0f766e",
    "#f59e0b"
  ],
  "domain": "心理咨询",
  "users": [
    "咨询师",
    "督导",
    "机构管理员"
  ],
  "metrics": [
    "活跃个案",
    "高风险关注",
    "本周会谈",
    "目标推进"
  ]
};

const statusColors = ["status-ok", "status-danger", "status-watch", "status-ok"];

const TOPICS = ["焦虑", "亲密关系", "亲子", "职业压力"] as const;
const RISK_LEVELS = ["稳定", "关注", "中风险", "高风险"] as const;
const RISK_CLASS: Record<string, string> = {
  "稳定": "risk-stable",
  "关注": "risk-watch",
  "中风险": "risk-mid",
  "高风险": "risk-high"
};
const HIGH_RISK = "高风险";
const STORAGE_KEY = "hxwl-12-records";

interface ConsultRecord {
  id: string;
  code: string;
  topic: string;
  risk: string;
  mood: string;
  intervention: string;
  goal: string;
  createdAt: number;
}

type FormState = {
  code: string;
  topic: string;
  risk: string;
  mood: string;
  intervention: string;
  goal: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  code: "",
  topic: "",
  risk: "",
  mood: "",
  intervention: "",
  goal: ""
};

const seedRecords: ConsultRecord[] = [
  {
    id: "seed-1",
    code: "C-042",
    topic: "焦虑",
    risk: "中风险",
    mood: "紧张、入睡困难，但愿意配合练习",
    intervention: "呼吸放松训练、睡眠卫生指导",
    goal: "睡眠改善，练习呼吸放松",
    createdAt: Date.now() - 1000 * 60 * 60 * 26
  },
  {
    id: "seed-2",
    code: "C-119",
    topic: "亲密关系",
    risk: "稳定",
    mood: "平稳，表达时偶有委屈",
    intervention: "情绪聚焦疗法、沟通模式梳理",
    goal: "识别沟通中的回避模式",
    createdAt: Date.now() - 1000 * 60 * 60 * 50
  },
  {
    id: "seed-3",
    code: "C-203",
    topic: "职业压力",
    risk: "关注",
    mood: "疲惫、对加班有明显抵触",
    intervention: "认知重构、边界设定演练",
    goal: "设定下周边界练习",
    createdAt: Date.now() - 1000 * 60 * 60 * 74
  }
];

function loadRecords(): ConsultRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as ConsultRecord[];
      }
    }
  } catch {
    // 本地数据损坏时回退到示例记录
  }
  return seedRecords;
}

function MetricCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [records, setRecords] = useState<ConsultRecord[]>(loadRecords);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [savedTip, setSavedTip] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const activeCases = useMemo(
    () => new Set(records.map((record) => record.code.trim())).size,
    [records]
  );
  const highRiskCount = useMemo(
    () => records.filter((record) => record.risk === HIGH_RISK).length,
    [records]
  );
  const metricValues = [String(activeCases), String(highRiskCount), "31", "7"];

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.createdAt - a.createdAt),
    [records]
  );

  const visibleRecords = useMemo(
    () =>
      sortedRecords.filter(
        (record) =>
          (!topicFilter || record.topic === topicFilter) &&
          (!riskFilter || record.risk === riskFilter)
      ),
    [sortedRecords, topicFilter, riskFilter]
  );

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSavedTip("");
  }

  function validate(current: FormState): FormErrors {
    const next: FormErrors = {};
    if (!current.code.trim()) next.code = "请填写来访者代号";
    if (!current.topic) next.topic = "请选择咨询主题";
    if (!current.risk) next.risk = "请选择风险等级";
    if (!current.mood.trim()) next.mood = "请填写情绪状态";
    if (!current.intervention.trim()) {
      next.intervention =
        current.risk === HIGH_RISK
          ? "高风险个案必须记录干预方法，暂不能保存"
          : "请填写干预方法";
    }
    if (!current.goal.trim()) {
      next.goal =
        current.risk === HIGH_RISK
          ? "高风险个案必须明确下次目标，暂不能保存"
          : "请填写下次目标";
    }
    return next;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSavedTip("");
      return;
    }

    const record: ConsultRecord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `r-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      code: form.code.trim(),
      topic: form.topic,
      risk: form.risk,
      mood: form.mood.trim(),
      intervention: form.intervention.trim(),
      goal: form.goal.trim(),
      createdAt: Date.now()
    };

    setRecords((prev) => [...prev, record]);
    setForm(EMPTY_FORM);
    setErrors({});
    // 让新记录立即出现在近期列表中
    setTopicFilter(null);
    setRiskFilter(null);
    setSavedTip(`已保存来访者 ${record.code} 的会谈记录`);
  }

  const hasFilter = topicFilter !== null || riskFilter !== null;
  const filterText = [
    topicFilter ? `主题：${topicFilter}` : null,
    riskFilter ? `风险：${riskFilter}` : null
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {project.metrics.map((metric: string, index: number) => (
          <MetricCard key={metric} label={metric} value={metricValues[index]} index={index} />
        ))}
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>角色</h2>
          <div className="chips">
            {project.users.map((user: string) => (
              <span key={user}>{user}</span>
            ))}
          </div>
          <h2>主题筛选</h2>
          <div className="chips muted filter-chips">
            <button
              className={topicFilter === null ? "active" : ""}
              onClick={() => setTopicFilter(null)}
            >
              全部
            </button>
            {TOPICS.map((topic) => (
              <button
                key={topic}
                className={topicFilter === topic ? "active" : ""}
                onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
              >
                {topic}
              </button>
            ))}
          </div>
          <h2>风险筛选</h2>
          <div className="chips muted filter-chips">
            <button
              className={riskFilter === null ? "active" : ""}
              onClick={() => setRiskFilter(null)}
            >
              全部
            </button>
            {RISK_LEVELS.map((level) => (
              <button
                key={level}
                className={`${riskFilter === level ? "active" : ""} ${RISK_CLASS[level]}`}
                onClick={() => setRiskFilter(riskFilter === level ? null : level)}
              >
                {level}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <form className="entry-form" onSubmit={handleSubmit} noValidate>
            <div className="section-heading">
              <div>
                <p>{project.domain}</p>
                <h2>会谈记录录入</h2>
              </div>
              <button type="submit" className="primary-action">保存记录</button>
            </div>
            {savedTip && <p className="save-tip" role="status">✓ {savedTip}</p>}
            <div className="field-grid">
              <label className={errors.code ? "has-error" : ""}>
                <span>来访者代号 *</span>
                <input
                  value={form.code}
                  placeholder="例如 C-217"
                  onChange={(event) => updateField("code", event.target.value)}
                />
                {errors.code && <em className="field-error">{errors.code}</em>}
              </label>
              <label className={errors.topic ? "has-error" : ""}>
                <span>咨询主题 *</span>
                <select
                  value={form.topic}
                  onChange={(event) => updateField("topic", event.target.value)}
                >
                  <option value="">请选择咨询主题</option>
                  {TOPICS.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
                {errors.topic && <em className="field-error">{errors.topic}</em>}
              </label>
              <label className={errors.risk ? "has-error" : ""}>
                <span>风险等级 *</span>
                <select
                  value={form.risk}
                  onChange={(event) => updateField("risk", event.target.value)}
                >
                  <option value="">请选择风险等级</option>
                  {RISK_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {errors.risk && <em className="field-error">{errors.risk}</em>}
              </label>
              <label className={errors.mood ? "has-error" : ""}>
                <span>情绪状态 *</span>
                <input
                  value={form.mood}
                  placeholder="填写本次会谈的情绪状态"
                  onChange={(event) => updateField("mood", event.target.value)}
                />
                {errors.mood && <em className="field-error">{errors.mood}</em>}
              </label>
              <label className={errors.intervention ? "has-error" : ""}>
                <span>干预方法 *</span>
                <textarea
                  rows={2}
                  value={form.intervention}
                  placeholder="填写本次采用的干预方法"
                  onChange={(event) => updateField("intervention", event.target.value)}
                />
                {errors.intervention && <em className="field-error">{errors.intervention}</em>}
              </label>
              <label className={errors.goal ? "has-error" : ""}>
                <span>下次目标 *</span>
                <textarea
                  rows={2}
                  value={form.goal}
                  placeholder="填写下次会谈前的目标"
                  onChange={(event) => updateField("goal", event.target.value)}
                />
                {errors.goal && <em className="field-error">{errors.goal}</em>}
              </label>
            </div>
          </form>
        </section>
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>{hasFilter ? `筛选结果 ${visibleRecords.length} 条` : "全部记录"}</p>
            <h2>近期记录</h2>
          </div>
          {hasFilter && (
            <button
              onClick={() => {
                setTopicFilter(null);
                setRiskFilter(null);
              }}
            >
              清除筛选（{filterText}）
            </button>
          )}
        </div>
        <div className="record-list">
          {visibleRecords.length === 0 ? (
            <p className="empty-tip">当前筛选条件下暂无记录</p>
          ) : (
            visibleRecords.map((record, index) => (
              <article
                key={record.id}
                className={`record-card ${record.risk === HIGH_RISK ? "is-high-risk" : ""}`}
              >
                <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="record-body">
                  <div className="record-meta">
                    <h3>{record.code}</h3>
                    <span className={`risk-badge ${RISK_CLASS[record.risk]}`}>{record.risk}</span>
                    <span className="topic-tag">{record.topic}</span>
                  </div>
                  <p><b>情绪状态</b>{record.mood}</p>
                  <p><b>干预方法</b>{record.intervention}</p>
                  <p><b>下次目标</b>{record.goal}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
