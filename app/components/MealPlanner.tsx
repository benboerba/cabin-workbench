"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { withBasePath } from "../lib/base-path";

type MealCategory = "meat" | "vegetable" | "staple" | "soup" | "other";

type MealSelector = {
  userId: string;
  displayName: string;
  username: string;
};

type MealRecipe = {
  id: string;
  name: string;
  description: string;
  category: MealCategory;
  imageData: string | null;
  isActive: boolean;
  selectors: MealSelector[];
  isSelectedByMe: boolean;
};

type MealData = {
  date: string;
  canManage: boolean;
  selectionLimit: number;
  mySelectionCount: number;
  recipes: MealRecipe[];
};

type RecipeDraft = {
  id: string | null;
  name: string;
  description: string;
  category: MealCategory;
  imageData: string | null | undefined;
};

const CATEGORY_OPTIONS: Array<{ key: "all" | MealCategory; label: string; icon: string }> = [
  { key: "all", label: "全部", icon: "✦" },
  { key: "meat", label: "荤菜", icon: "肉" },
  { key: "vegetable", label: "素菜", icon: "菜" },
  { key: "staple", label: "主食", icon: "饭" },
  { key: "soup", label: "汤", icon: "汤" },
  { key: "other", label: "其他", icon: "味" },
];

const EMPTY_DRAFT: RecipeDraft = {
  id: null,
  name: "",
  description: "",
  category: "meat",
  imageData: undefined,
};

function categoryLabel(category: MealCategory) {
  return CATEGORY_OPTIONS.find((item) => item.key === category)?.label ?? "其他";
}

function formatDinnerDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(year, month - 1, day));
}

async function mealApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBasePath(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "操作没有成功，请稍后再试");
  return result;
}

function compressRecipeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("请选择图片文件"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片格式无法识别"));
      image.onload = () => {
        const maxSide = 1000;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("图片处理失败"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function MealPlanner({
  displayName,
  theme,
  onBack,
  onToggleTheme,
  onUse,
}: {
  displayName: string;
  theme: "cabin" | "office";
  onBack: () => void;
  onToggleTheme: () => void;
  onUse: () => void;
}) {
  const [data, setData] = useState<MealData | null>(null);
  const [category, setCategory] = useState<"all" | MealCategory>("all");
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await mealApi<MealData>("/api/meals");
    setData(result);
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load().catch((reason) => {
      setError(reason instanceof Error ? reason.message : "菜单加载失败");
    }), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const menuRecipes = useMemo(
    () => (data?.recipes ?? []).filter((recipe) => recipe.isActive && (category === "all" || recipe.category === category)),
    [category, data?.recipes],
  );
  const orderedRecipes = useMemo(
    () => (data?.recipes ?? []).filter((recipe) => recipe.isActive && recipe.selectors.length > 0),
    [data?.recipes],
  );
  const myRecipes = useMemo(
    () => (data?.recipes ?? []).filter((recipe) => recipe.isSelectedByMe),
    [data?.recipes],
  );

  async function toggleRecipe(recipe: MealRecipe) {
    if (!data || busyId) return;
    if (!recipe.isSelectedByMe && data.mySelectionCount >= data.selectionLimit) {
      setError(`每人最多点 ${data.selectionLimit} 道菜`);
      return;
    }
    setBusyId(recipe.id);
    setError("");
    try {
      await mealApi(`/api/meals/selections/${recipe.id}`, {
        method: recipe.isSelectedByMe ? "DELETE" : "POST",
      });
      onUse();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "点菜失败");
    } finally {
      setBusyId(null);
    }
  }

  function openRecipeEditor(recipe?: MealRecipe) {
    setError("");
    setDraft(recipe ? {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      imageData: recipe.imageData,
    } : { ...EMPTY_DRAFT });
  }

  async function saveRecipe(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    try {
      const path = draft.id ? `/api/meals/recipes/${draft.id}` : "/api/meals/recipes";
      await mealApi(path, {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          category: draft.category,
          ...(draft.imageData !== undefined ? { imageData: draft.imageData } : {}),
        }),
      });
      onUse();
      setDraft(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "菜谱保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(recipe: MealRecipe) {
    if (busyId) return;
    setBusyId(recipe.id);
    setError("");
    try {
      await mealApi(`/api/meals/recipes/${recipe.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !recipe.isActive }),
      });
      onUse();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "菜谱状态更新失败");
    } finally {
      setBusyId(null);
    }
  }

  async function chooseImage(file: File | undefined) {
    if (!file || !draft) return;
    try {
      const imageData = await compressRecipeImage(file);
      setDraft((current) => current ? { ...current, imageData } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片处理失败");
    }
  }

  return (
    <main className={`meal-planner ${theme === "cabin" ? "meal-planner-cabin" : ""}`}>
      <header className="meal-header">
        <button className="meal-back" type="button" onClick={onBack} aria-label="返回工作台">←</button>
        <div className="meal-brand"><span>餐</span><div><small>FAMILY DINNER</small><strong>今晚吃什么</strong></div></div>
        <div className="meal-header-actions">
          <button type="button" onClick={onToggleTheme}>{theme === "office" ? "切到木屋风" : "切到办公风"}</button>
          <span>{displayName}</span>
        </div>
      </header>

      <div className="meal-page">
        <section className="meal-hero">
          <div><p>TONIGHT · 四个人的家庭点菜板</p><h1>今晚，想吃点什么？</h1><span>{data ? `${formatDinnerDate(data.date)} · 晚饭` : "正在准备今晚菜单…"}</span></div>
          <aside><small>我的选择</small><strong>{data?.mySelectionCount ?? 0}<i> / {data?.selectionLimit ?? 6}</i></strong><span>点一下菜品就选好了</span></aside>
        </section>

        {error && <div className="meal-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")}>×</button></div>}

        <section className="meal-category-tabs" aria-label="菜品分类">
          {CATEGORY_OPTIONS.map((item) => (
            <button type="button" className={category === item.key ? "active" : ""} key={item.key} onClick={() => setCategory(item.key)}>
              <i>{item.icon}</i><span>{item.label}</span>
            </button>
          ))}
        </section>

        <div className="meal-content-grid">
          <section className="meal-menu-section">
            <div className="meal-section-head"><div><small>TONIGHT&apos;S MENU</small><h2>今晚菜单</h2></div>{data?.canManage && <button type="button" onClick={() => setManageOpen(true)}>管理菜谱</button>}</div>
            {menuRecipes.length > 0 ? (
              <div className="meal-recipe-grid">
                {menuRecipes.map((recipe) => {
                  const limitReached = Boolean(data && data.mySelectionCount >= data.selectionLimit && !recipe.isSelectedByMe);
                  return (
                    <article className={`meal-recipe-card ${recipe.isSelectedByMe ? "selected" : ""}`} key={recipe.id}>
                      <button type="button" className="meal-recipe-main" onClick={() => void toggleRecipe(recipe)} disabled={busyId === recipe.id || limitReached} aria-pressed={recipe.isSelectedByMe}>
                        <span className="meal-recipe-photo">
                          {recipe.imageData ? <img src={recipe.imageData} alt="" /> : <i>{CATEGORY_OPTIONS.find((item) => item.key === recipe.category)?.icon ?? "味"}</i>}
                          <b>{recipe.isSelectedByMe ? "✓ 已点" : "+ 想吃"}</b>
                        </span>
                        <span className="meal-recipe-copy"><small>{categoryLabel(recipe.category)}</small><strong>{recipe.name}</strong><em>{recipe.description || "今晚可以安排"}</em></span>
                      </button>
                      <div className="meal-selector-row">
                        {recipe.selectors.length > 0 ? <><span>{recipe.selectors.map((selector) => selector.displayName).join("、")}</span><small>想吃</small></> : <small>还没有人点</small>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="meal-empty"><span>🍽</span><strong>{data?.canManage ? "还没有上架的菜" : "今晚菜单还在准备"}</strong><p>{data?.canManage ? "先添加一道家里常做的菜吧。" : "等 bob 加好菜谱就可以点了。"}</p>{data?.canManage && <button type="button" onClick={() => openRecipeEditor()}>＋ 添加第一道菜</button>}</div>
            )}
          </section>

          <aside className="meal-summary-panel">
            <div className="meal-section-head"><div><small>EVERYONE&apos;S PICKS</small><h2>大家已点</h2></div><span>{orderedRecipes.length} 道</span></div>
            {orderedRecipes.length > 0 ? (
              <div className="meal-summary-list">
                {orderedRecipes.map((recipe) => (
                  <article key={recipe.id}>
                    <span>{recipe.imageData ? <img src={recipe.imageData} alt="" /> : categoryLabel(recipe.category).slice(0, 1)}</span>
                    <div><strong>{recipe.name}</strong><small>{recipe.selectors.map((selector) => selector.displayName).join("、")} 想吃</small></div>
                    {recipe.isSelectedByMe && <button type="button" onClick={() => void toggleRecipe(recipe)} disabled={busyId === recipe.id}>取消</button>}
                  </article>
                ))}
              </div>
            ) : <div className="meal-summary-empty">今晚还没人点菜<br /><small>从左边挑一道开始吧</small></div>}
            <div className="meal-my-picks"><span>我的选择</span><strong>{myRecipes.length} / {data?.selectionLimit ?? 6}</strong>{myRecipes.length > 0 && <p>{myRecipes.map((recipe) => recipe.name).join(" · ")}</p>}</div>
          </aside>
        </div>
      </div>

      <div className="meal-mobile-tray"><span>我的选择 <strong>{data?.mySelectionCount ?? 0}/{data?.selectionLimit ?? 6}</strong></span><em>{myRecipes.length > 0 ? myRecipes.map((recipe) => recipe.name).join("、") : "还没有点菜"}</em></div>

      {manageOpen && data?.canManage && (
        <div className="meal-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setManageOpen(false)}>
          <section className="meal-manager" role="dialog" aria-modal="true" aria-labelledby="meal-manager-title">
            <button type="button" className="meal-modal-close" onClick={() => setManageOpen(false)} aria-label="关闭">×</button>
            <div className="meal-manager-head"><div><small>BOB · RECIPE LIBRARY</small><h2 id="meal-manager-title">菜谱管理</h2><p>菜谱长期保留，下架后其他人暂时看不到。</p></div><button type="button" onClick={() => openRecipeEditor()}>＋ 添加菜谱</button></div>
            {error && <div className="meal-modal-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")}>×</button></div>}
            <div className="meal-manager-list">
              {data.recipes.map((recipe) => (
                <article className={!recipe.isActive ? "inactive" : ""} key={recipe.id}>
                  <span>{recipe.imageData ? <img src={recipe.imageData} alt="" /> : categoryLabel(recipe.category).slice(0, 1)}</span>
                  <div><small>{categoryLabel(recipe.category)} · {recipe.isActive ? "可点" : "已下架"}</small><strong>{recipe.name}</strong><em>{recipe.description || "暂无简介"}</em></div>
                  <button type="button" onClick={() => openRecipeEditor(recipe)}>编辑</button>
                  <button type="button" onClick={() => void toggleAvailability(recipe)} disabled={busyId === recipe.id}>{recipe.isActive ? "下架" : "恢复"}</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {draft && (
        <div className="meal-modal-backdrop meal-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDraft(null)}>
          <form className="meal-editor" onSubmit={(event) => void saveRecipe(event)}>
            <button type="button" className="meal-modal-close" onClick={() => setDraft(null)} aria-label="关闭">×</button>
            <small>{draft.id ? "EDIT RECIPE" : "NEW RECIPE"}</small>
            <h2>{draft.id ? "编辑这道菜" : "加入一道家常菜"}</h2>
            <label className="meal-image-field">
              <span>{draft.imageData ? <img src={draft.imageData} alt="菜品预览" /> : <i>＋</i>}</span>
              <strong>{draft.imageData ? "更换图片" : "上传菜品图片"}</strong>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseImage(event.target.files?.[0])} />
            </label>
            <label>菜名<input required maxLength={40} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：番茄炒蛋" /></label>
            <label>分类<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as MealCategory })}>{CATEGORY_OPTIONS.filter((item) => item.key !== "all").map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <label>一句介绍（可选）<textarea maxLength={160} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="例如：酸甜下饭，十分钟就能做好。" /></label>
            {error && <div className="meal-modal-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")}>×</button></div>}
            {draft.imageData && <button type="button" className="meal-remove-image" onClick={() => setDraft({ ...draft, imageData: null })}>移除图片</button>}
            <button type="submit" className="meal-save" disabled={saving}>{saving ? "正在保存…" : "保存菜谱"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
