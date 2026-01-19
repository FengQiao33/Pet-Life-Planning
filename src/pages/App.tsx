import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { PetScene } from "../scene/PetScene";
import { emotionKnowledge } from "../utils/emotionKnowledge";

type HealthStatus = "健康" | "偏胖" | "偏瘦" | "肠胃敏感" | "皮肤敏感" | "关节风险" | "老年慢病";

const FormSchema = z.object({
  species: z.string().trim().min(1, "请填写宠物品种/类型"),
  ageYears: z.number().min(0, "年龄不能为负数").max(40, "年龄看起来不太合理"),
  health: z.custom<HealthStatus>(),
  notes: z.string().trim().max(200, "备注过长").optional()
});

type PlanResponse = {
  meta: {
    species: string;
    ageYears: number;
    health: HealthStatus;
    intensity: "低" | "中" | "高";
    seasonHint: string;
  };
  feeding: string[];
  exercise: string[];
  care: string[];
  safety: string[];
};

const HealthOptions: HealthStatus[] = ["健康", "偏胖", "偏瘦", "肠胃敏感", "皮肤敏感", "关节风险", "老年慢病"];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickDefaultAge(species: string) {
  const s = species.toLowerCase();
  if (s.includes("猫") || s.includes("cat")) return 2;
  if (s.includes("犬") || s.includes("狗") || s.includes("dog")) return 3;
  if (s.includes("兔") || s.includes("rabbit")) return 1;
  return 2;
}

export default function App() {
  const [species, setSpecies] = useState("英短");
  const [ageYearsStr, setAgeYearsStr] = useState("2");
  const [health, setHealth] = useState<HealthStatus>("健康");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);

  const emotionCard = useMemo(() => {
    const idx = Math.abs(hash(`${species}|${health}|${ageYearsStr}`)) % emotionKnowledge.length;
    return emotionKnowledge[idx];
  }, [species, health, ageYearsStr]);

  async function generate() {
    setError(null);
    setLoading(true);
    setPlan(null);
    try {
      const ageYears = clamp(Number(ageYearsStr || 0), 0, 40);
      const parsed = FormSchema.safeParse({ species, ageYears, health, notes });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "输入有误");
        return;
      }
      const res = await fetch(`/api/plan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `请求失败（${res.status}）`);
      }
      const json = (await res.json()) as PlanResponse;
      setPlan(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  function fillExample(nextSpecies: string) {
    setSpecies(nextSpecies);
    setAgeYearsStr(String(pickDefaultAge(nextSpecies)));
    setHealth("健康");
    setNotes("");
    setPlan(null);
    setError(null);
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1 className="title">宠物生活规划卡</h1>
          <p className="subtitle">
            输入品种、年龄与健康状况，生成「每日喂食 / 运动 / 护理」计划，并附一张宠物情绪识别小知识卡片。
          </p>
        </div>
        <div className="pill">
          <span className="muted">拖拽右侧场景</span>
          <span className="muted">·</span>
          <span className="muted">滚轮缩放</span>
        </div>
      </div>

      <div className="grid">
        <div className="card panel">
          <h2>信息输入</h2>
          <div className="split">
            <div>
              <label>宠物品种 / 类型</label>
              <input
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="例如：金毛、英短、柯基、暹罗、兔子..."
                inputMode="text"
                autoComplete="off"
              />
            </div>
            <div>
              <label>年龄（岁）</label>
              <input
                value={ageYearsStr}
                onChange={(e) => setAgeYearsStr(e.target.value)}
                inputMode="decimal"
                placeholder="例如：2"
              />
            </div>
            <div>
              <label>健康状况</label>
              <select value={health} onChange={(e) => setHealth(e.target.value as HealthStatus)}>
                {HealthOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>备注（可选）</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例如：易紧张、最近换粮、室内为主..." />
            </div>
          </div>

          <div className="actions">
            <button className="btn" onClick={generate} disabled={loading}>
              {loading ? "生成中..." : "生成今日计划"}
            </button>
            <button className="btnSecondary" onClick={() => fillExample("金毛")} disabled={loading}>
              一键示例：金毛
            </button>
            <button className="btnSecondary" onClick={() => fillExample("暹罗")} disabled={loading}>
              一键示例：暹罗
            </button>
          </div>

          <div className="hint">
            小提示：计划为日常参考，若存在明确疾病或用药，请以兽医建议为准；运动强度会随年龄与健康状态自动调整。
          </div>

          {error ? (
            <div className="hr" />
          ) : null}
          {error ? (
            <div className="resultCard" style={{ borderColor: "rgba(251,113,133,.35)" }}>
              <div className="resultTop">
                <div className="kicker">输入校验 / 请求错误</div>
                <span className="badge" style={{ borderColor: "rgba(251,113,133,.35)" }}>
                  请检查
                </span>
              </div>
              <div className="muted">{error}</div>
            </div>
          ) : null}

          <div className="results">
            {plan ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="resultCard">
                  <div className="resultTop">
                    <div className="kicker">喂食计划</div>
                    <span className="badge">
                      强度：{plan.meta.intensity} · {plan.meta.seasonHint}
                    </span>
                  </div>
                  <ul className="list">
                    {plan.feeding.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="resultCard" style={{ marginTop: 12 }}>
                  <div className="resultTop">
                    <div className="kicker">运动计划</div>
                    <span className="badge">按年龄/健康动态调整</span>
                  </div>
                  <ul className="list">
                    {plan.exercise.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="resultCard" style={{ marginTop: 12 }}>
                  <div className="resultTop">
                    <div className="kicker">护理计划</div>
                    <span className="badge">更细的提醒</span>
                  </div>
                  <ul className="list">
                    {plan.care.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="resultCard" style={{ marginTop: 12 }}>
                  <div className="resultTop">
                    <div className="kicker">安全与观察</div>
                    <span className="badge">今日关注点</span>
                  </div>
                  <ul className="list">
                    {plan.safety.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                  <div className="muted small" style={{ marginTop: 8 }}>
                    备注：{plan.meta.species} · {plan.meta.ageYears} 岁 · {plan.meta.health}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="resultCard">
                <div className="resultTop">
                  <div className="kicker">情绪识别小知识</div>
                  <span className="badge">每日一条</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>{emotionCard.title}</div>
                  <div className="muted" style={{ lineHeight: 1.6 }}>
                    {emotionCard.desc}
                  </div>
                  <div className="muted small">观察要点：{emotionCard.observe.join(" / ")}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card sceneWrap">
          <PetScene species={species} health={health} ageYears={Number(ageYearsStr || 0)} />
          <div className="sceneOverlay">
            <div className="sceneOverlayRow">
              <div className="chip">实时粒子环：随“状态”变化</div>
              <div className="chip">能量球：拖拽旋转 / 缩放</div>
            </div>
            <div className="sceneOverlayRow">
              <div className="chip">
                情绪提示：<span style={{ color: "rgba(110,231,255,.92)", fontWeight: 800 }}>{emotionCard.tag}</span>
              </div>
              <div className="chip">生成计划会锁定今天的节奏</div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <div>© 2026 Pet Life Planning</div>
        <div className="muted">适配移动端 · 可直接部署至 ESA Pages</div>
      </div>
    </div>
  );
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

