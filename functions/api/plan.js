/**
 * ESA Pages 边缘函数：POST /api/plan
 * 入参：{ species, ageYears, health, notes? }
 * 出参：{ meta, feeding, exercise, care, safety }
 */

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function bad(message, status = 400) {
  return json({ error: message }, { status });
}

function nowSeasonHint(d = new Date()) {
  const m = d.getMonth() + 1;
  if (m <= 2 || m === 12) return "冬季：注意保暖与关节热身";
  if (m >= 6 && m <= 8) return "夏季：注意补水与防中暑";
  if (m >= 3 && m <= 5) return "春季：注意换毛与寄生虫";
  return "秋季：注意皮肤与运动回归";
}

function intensityByAge(ageYears) {
  if (ageYears < 1) return "低";
  if (ageYears < 7) return "中";
  return "低";
}

function normalizeHealth(raw) {
  const v = String(raw || "").trim();
  const allow = ["健康", "偏胖", "偏瘦", "肠胃敏感", "皮肤敏感", "关节风险", "老年慢病"];
  return allow.includes(v) ? v : "健康";
}

function isCat(species) {
  const s = String(species || "").toLowerCase();
  return s.includes("猫") || s.includes("cat") || s.includes("英短") || s.includes("布偶") || s.includes("暹罗");
}
function isDog(species) {
  const s = String(species || "").toLowerCase();
  return s.includes("狗") || s.includes("犬") || s.includes("dog") || s.includes("金毛") || s.includes("柯基") || s.includes("拉布拉多");
}

function buildPlan({ species, ageYears, health, notes }) {
  const seasonHint = nowSeasonHint();
  const baseIntensity = intensityByAge(ageYears);
  const senior = ageYears >= 8;
  const kittenPup = ageYears < 1;

  let intensity = baseIntensity;
  if (health === "偏瘦") intensity = baseIntensity === "低" ? "中" : "高";
  if (health === "偏胖" || health === "关节风险" || health === "老年慢病") intensity = "低";
  if (health === "肠胃敏感" || health === "皮肤敏感") intensity = baseIntensity === "高" ? "中" : baseIntensity;
  if (senior) intensity = "低";

  const feeding = [];
  const exercise = [];
  const care = [];
  const safety = [];

  // Feeding
  if (isCat(species)) {
    feeding.push("分 2–3 餐投喂，优先高蛋白主食；零食控制在每日热量的 10% 内。");
    feeding.push("准备清水 + 流动水源（饮水机/循环碗），观察是否主动饮水。");
    feeding.push("用“嗅闻/慢食碗”延长进食时间，降低狼吞风险。");
  } else if (isDog(species)) {
    feeding.push("分 2 餐投喂，固定时间与固定地点，减少应激。");
    feeding.push("训练奖励零食“拆分多次”，总量控制在每日热量 10% 内。");
    feeding.push("饭后至少休息 40–60 分钟再进行剧烈运动，避免胃扭转风险。");
  } else {
    feeding.push("主食优先、定时定量；零食不超过每日热量 10%。");
    feeding.push("清水随时可得，水碗每日清洗；天气热可加一次补水检查。");
    feeding.push("尝试“慢喂/嗅闻投喂”方式，让进食节奏更稳定。");
  }

  if (kittenPup) feeding.push("幼年期：少量多餐（3–4 餐），逐步建立固定作息。");
  if (health === "肠胃敏感") feeding.push("肠胃敏感：避免频繁换粮；若需换粮，7 天渐进混粮过渡。");
  if (health === "偏胖") feeding.push("偏胖：优先选择控重主粮；将日粮拆成更小份，提高饱腹感。");
  if (health === "偏瘦") feeding.push("偏瘦：增加一次小餐或提升能量密度；优先做体况评估再加量。");
  if (health === "老年慢病") feeding.push("老年慢病：遵循兽医处方/处方粮建议；记录食欲、饮水和排泄变化。");

  // Exercise
  if (isCat(species)) {
    exercise.push("互动逗猫 2 轮：每轮 8–12 分钟（逗棒/追逐），以“捕获-进食-休息”收尾。");
    exercise.push("设置垂直空间：猫爬架/窗台观察点，鼓励自主活动。");
    exercise.push("嗅闻/找零食小游戏 5 分钟，提高专注与消耗。");
  } else if (isDog(species)) {
    exercise.push("外出散步 2 次：每次 20–40 分钟，先慢走热身再加速。");
    exercise.push("加入 5–8 分钟基础训练（坐/等/召回），用脑消耗替代纯体力。");
    exercise.push("晚间安排嗅闻探索（草地/闻闻路线）10 分钟，帮助放松。");
  } else {
    exercise.push("以“轻量频次”为主：2–3 次短时活动，总计 20–40 分钟。");
    exercise.push("加入 5 分钟嗅闻/益智玩具，让消耗更均衡。");
  }

  if (intensity === "低") {
    exercise.unshift("今日强度偏低：以慢走/低冲击互动为主，避免长时间冲刺或跳跃。");
  } else if (intensity === "高") {
    exercise.unshift("今日强度偏高：分段运动，确保补水与休息，避免一次性拉满。");
  } else {
    exercise.unshift("今日强度中等：有氧 + 训练 + 嗅闻组合，节奏更稳定。");
  }

  if (health === "关节风险" || senior) {
    exercise.push("关节/老年：优先平地慢走与缓坡；减少上下楼与高落差跳跃。");
    care.push("关节护理：热身 3–5 分钟；运动后擦干脚掌，必要时用温热毛巾热敷 5 分钟。");
  }
  if (health === "偏胖") {
    exercise.push("控重建议：把总运动拆成更多短段（例如 4×10 分钟），提升坚持度。");
  }

  // Care
  care.push("日常梳毛 3–8 分钟：顺毛 + 逆毛轻梳，重点腋下/腹部/尾根，减少打结。");
  care.push("牙齿护理：每日或隔日刷牙 1 次；无法刷牙时用洁齿零食/凝胶替代。");
  care.push("脚掌检查：是否有裂口、异物、红肿；外出回家擦脚更稳妥。");
  if (health === "皮肤敏感") {
    care.push("皮肤敏感：减少频繁洗澡；洗护选温和配方并彻底吹干，观察红痒与掉毛区域。");
  }
  if (health === "肠胃敏感") {
    care.push("肠胃敏感：记录大便形态（软硬/次数/黏液），有助于快速定位诱因。");
  }
  if (kittenPup) care.push("幼年期：增加“触碰脱敏”（摸耳朵/爪子/尾巴），为未来护理打基础。");

  // Safety / observation
  safety.push("观察精神与食欲：若连续 24 小时明显下降，建议尽快咨询兽医。");
  safety.push("观察饮水与排泄：突然增多/减少都值得记录；出现血便/呕吐频繁需就医。");
  safety.push("今日环境：保持安静角落与可躲藏空间，减少突发噪音与强行抱起。");
  if (notes && String(notes).trim()) {
    safety.push(`备注提醒：${String(notes).trim().slice(0, 120)}`);
  }

  return {
    meta: { species, ageYears, health, intensity, seasonHint },
    feeding,
    exercise,
    care,
    safety
  };
}

// ESA Pages 边缘函数标准格式：导出包含 fetch 函数的对象
export default {
  async fetch(request) {
    // 只支持 POST 方法
    if (request.method !== "POST") {
      return bad("Only POST is supported", 405);
    }

    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch {
      return bad("Invalid JSON body");
    }

    // 提取并校验参数
    const species = String(body?.species || "").trim();
    const ageYears = Number(body?.ageYears);
    const health = normalizeHealth(body?.health);
    const notes = body?.notes == null ? "" : String(body.notes);

    // 参数校验
    if (!species) {
      return bad("species is required");
    }
    if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears > 40) {
      return bad("ageYears is invalid");
    }

    // 生成计划并返回
    return json(buildPlan({ species, ageYears, health, notes }));
  }
};

