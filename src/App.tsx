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
  ],
  "filters": [
    "焦虑",
    "亲密关系",
    "亲子",
    "职业压力"
  ]
};

const RISK_LEVELS = ["稳定", "关注", "中风险", "高风险"];
const HIGH_RISK = "高风险";
const STORAGE_KEY = "hxwl-12-records";

type CaseRecord = {
  id: string;
  code: string;
  topic: string;
  risk: string;
  mood: string;
  intervention: string;
  goal: string;
  date: string;
};

type FormState = {
  code: string;
  topic: string;
  risk: string;
  mood: string;
  intervention: string;
  goal: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  code: "",
  topic: "",
  risk: "",
  mood: "",
  intervention: "",
  goal: ""
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const seedRecords: CaseRecord[] = [
  { id: "seed-1", code: "C-042", topic: "焦虑", risk: "中风险", mood: "紧张、入睡困难", intervention: "呼吸放松训练", goal: "睡眠改善，练习呼吸放松", date: daysAgo(2) },
  { id: "seed-2", code: "C-119", topic: "亲密关系", risk: "稳定", mood: "情绪平稳", intervention: "沟通模式探索", goal: "识别沟通中的回避模式", date: daysAgo(4) },
  { id: "seed-3", code: "C-203", topic: "职业压力", risk: "关注", mood: "疲惫、紧绷", intervention: "压力记录与边界练习", goal: "设定下周边界练习", date: daysAgo(6) }
];

function loadRecords(): CaseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as CaseRecord[];
      }
    }
  } catch {
    // 本地数据损坏时回退到示例数据
  }
  return seedRecords;
}

function weekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.code.trim()) errors.code = "请填写来访者代号";
  if (!form.topic) errors.topic = "请选择咨询主题";
  if (!form.risk) errors.risk = "请选择风险等级";
  if (!form.mood.trim()) errors.mood = "请填写情绪状态";
  if (!form.intervention.trim()) {
    errors.intervention = form.risk === HIGH_RISK ? "高风险个案必须填写干预方法" : "请填写干预方法";
  }
  if (!form.goal.trim()) {
    errors.goal = form.risk === HIGH_RISK ? "高风险个案必须填写下次目标" : "请填写下次目标";
  }
  return errors;
}

const statusColors = ["status-ok", "status-watch", "status-danger"];

function MetricCard({ label, value, index }: { label: string; value: number; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [records, setRecords] = useState<CaseRecord[]>(loadRecords);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [savedTip, setSavedTip] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const metrics = useMemo(() => {
    const monday = weekStart();
    return [
      new Set(records.map((r) => r.code)).size,
      records.filter((r) => r.risk === HIGH_RISK).length,
      records.filter((r) => r.date >= monday).length,
      records.filter((r) => r.goal.trim() !== "").length
    ];
  }, [records]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          (topicFilter === null || r.topic === topicFilter) &&
          (riskFilter === null || r.risk === riskFilter)
      ),
    [records, topicFilter, riskFilter]
  );

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSavedTip("");
  }

  function resetForm() {
    setForm(emptyForm);
    setErrors({});
    setSavedTip("");
  }

  function handleSave() {
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSavedTip("");
      return;
    }
    const record: CaseRecord = {
      id: `rec-${Date.now()}`,
      code: form.code.trim(),
      topic: form.topic,
      risk: form.risk,
      mood: form.mood.trim(),
      intervention: form.intervention.trim(),
      goal: form.goal.trim(),
      date: daysAgo(0)
    };
    setRecords((prev) => [record, ...prev]);
    setForm(emptyForm);
    setErrors({});
    setSavedTip(`已保存 ${record.code} 的会谈记录`);
  }

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
          <MetricCard key={metric} label={metric} value={metrics[index]} index={index} />
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
          <div className="chips muted">
            {project.filters.map((filter: string) => (
              <button
                key={filter}
                className={topicFilter === filter ? "active" : ""}
                onClick={() => setTopicFilter(topicFilter === filter ? null : filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <h2>风险筛选</h2>
          <div className="chips muted">
            {RISK_LEVELS.map((level: string) => (
              <button
                key={level}
                className={riskFilter === level ? "active" : ""}
                onClick={() => setRiskFilter(riskFilter === level ? null : level)}
              >
                {level}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>{project.domain}</p>
              <h2>录入会谈记录</h2>
            </div>
            <button className="primary-action" onClick={resetForm}>新增记录</button>
          </div>
          <div className="field-grid">
            <label>
              <span>来访者代号</span>
              <input
                className={errors.code ? "invalid" : ""}
                placeholder="如 C-042"
                value={form.code}
                onChange={(e) => updateField("code", e.target.value)}
              />
              {errors.code && <em className="field-error">{errors.code}</em>}
            </label>
            <label>
              <span>咨询主题</span>
              <select
                className={errors.topic ? "invalid" : ""}
                value={form.topic}
                onChange={(e) => updateField("topic", e.target.value)}
              >
                <option value="">请选择咨询主题</option>
                {project.filters.map((topic: string) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
              {errors.topic && <em className="field-error">{errors.topic}</em>}
            </label>
            <label>
              <span>风险等级</span>
              <select
                className={errors.risk ? "invalid" : ""}
                value={form.risk}
                onChange={(e) => updateField("risk", e.target.value)}
              >
                <option value="">请选择风险等级</option>
                {RISK_LEVELS.map((level: string) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {errors.risk && <em className="field-error">{errors.risk}</em>}
            </label>
            <label>
              <span>情绪状态</span>
              <input
                className={errors.mood ? "invalid" : ""}
                placeholder="如 紧张、低落、平稳"
                value={form.mood}
                onChange={(e) => updateField("mood", e.target.value)}
              />
              {errors.mood && <em className="field-error">{errors.mood}</em>}
            </label>
            <label>
              <span>干预方法</span>
              <input
                className={errors.intervention ? "invalid" : ""}
                placeholder="如 认知重构、放松训练"
                value={form.intervention}
                onChange={(e) => updateField("intervention", e.target.value)}
              />
              {errors.intervention && <em className="field-error">{errors.intervention}</em>}
            </label>
            <label>
              <span>下次目标</span>
              <input
                className={errors.goal ? "invalid" : ""}
                placeholder="如 完成情绪日记"
                value={form.goal}
                onChange={(e) => updateField("goal", e.target.value)}
              />
              {errors.goal && <em className="field-error">{errors.goal}</em>}
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-action" onClick={handleSave}>保存记录</button>
            {savedTip && <span className="save-tip">{savedTip}</span>}
          </div>
        </section>
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>个案记录</p>
            <h2>近期记录（{filteredRecords.length} / {records.length}）</h2>
          </div>
          <button>导出摘要</button>
        </div>
        <div className="record-list">
          {filteredRecords.length === 0 && (
            <p className="empty-tip">暂无符合条件的记录</p>
          )}
          {filteredRecords.map((record, index) => (
            <article key={record.id} className="record-card">
              <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3>
                  {record.code}
                  <span className={`risk-badge risk-${RISK_LEVELS.indexOf(record.risk)}`}>{record.risk}</span>
                </h3>
                <p>
                  {record.topic} · {record.mood} · {record.intervention} · 下次目标：{record.goal} · {record.date}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
