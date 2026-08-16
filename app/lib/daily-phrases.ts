export type DailyPhrase = {
  id: string;
  language: string;
  country: string;
  flag: string;
  locale: string;
  text: string;
  pronunciation: string;
  meaning: string;
  context: string;
  source: string;
};

export const DAILY_PHRASES: DailyPhrase[] = [
  { id: "ja-baigaeshi", language: "日语", country: "日本", flag: "🇯🇵", locale: "ja-JP", text: "倍返しだ！", pronunciation: "倍嘎诶西哒", meaning: "加倍奉还！", context: "一句把不服输喊得很痛快的出圈台词。", source: "《半泽直树》" },
  { id: "en-how-you-doin", language: "英语", country: "美国", flag: "🇺🇸", locale: "en-US", text: "How you doin'?", pronunciation: "浩 优 杜因", meaning: "最近怎么样？", context: "语气比字面更重要，轻松又带点自信。", source: "《老友记》" },
  { id: "ko-daebak", language: "韩语", country: "韩国", flag: "🇰🇷", locale: "ko-KR", text: "대박!", pronunciation: "带吧", meaning: "太绝了！", context: "看到离谱、惊喜或厉害的东西都能脱口而出。", source: "韩国综艺常用语" },
  { id: "ar-yalla", language: "阿拉伯语", country: "阿拉伯地区", flag: "🇦🇪", locale: "ar-AE", text: "يلا!", pronunciation: "亚拉", meaning: "走吧！快点！", context: "短促又有推动力，日常聊天出现频率很高。", source: "阿拉伯语日常表达" },
  { id: "es-vamos", language: "西班牙语", country: "西班牙", flag: "🇪🇸", locale: "es-ES", text: "¡Vamos!", pronunciation: "巴莫斯", meaning: "冲！我们走！", context: "球场和生活里都很上头的一声助威。", source: "西语体育与日常表达" },
  { id: "fr-cest-la-vie", language: "法语", country: "法国", flag: "🇫🇷", locale: "fr-FR", text: "C'est la vie.", pronunciation: "塞 拉 维", meaning: "生活就是这样。", context: "无奈里带一点松弛感，适合放过偶尔的不顺。", source: "法语日常表达" },
  { id: "de-los-gehts", language: "德语", country: "德国", flag: "🇩🇪", locale: "de-DE", text: "Los geht's!", pronunciation: "洛斯 给次", meaning: "开始吧！出发！", context: "开始工作或一起行动时很有节奏的一句话。", source: "德语日常表达" },
  { id: "it-mamma-mia", language: "意大利语", country: "意大利", flag: "🇮🇹", locale: "it-IT", text: "Mamma mia!", pronunciation: "妈妈 米呀", meaning: "我的天哪！", context: "惊讶、赞叹、无语都能用，情绪非常有画面。", source: "意大利语流行表达" },
  { id: "pt-bora", language: "葡萄牙语", country: "巴西", flag: "🇧🇷", locale: "pt-BR", text: "Bora!", pronunciation: "博拉", meaning: "走起！", context: "来自 vamos embora 的口语缩写，短得很有冲劲。", source: "巴西葡语日常表达" },
  { id: "ru-poekhali", language: "俄语", country: "俄罗斯", flag: "🇷🇺", locale: "ru-RU", text: "Поехали!", pronunciation: "巴耶哈利", meaning: "出发！", context: "一句极有历史画面的出发宣言。", source: "尤里·加加林公开讲话" },
  { id: "th-su-su", language: "泰语", country: "泰国", flag: "🇹🇭", locale: "th-TH", text: "สู้ ๆ!", pronunciation: "素 素", meaning: "加油！", context: "朋友间最轻巧的鼓励，重复两遍更有力量。", source: "泰语日常表达" },
  { id: "vi-troi-oi", language: "越南语", country: "越南", flag: "🇻🇳", locale: "vi-VN", text: "Trời ơi!", pronunciation: "哲依 欧伊", meaning: "我的天！", context: "惊讶时非常有感染力的一声感叹。", source: "越南语日常表达" },
  { id: "hi-chalo", language: "印地语", country: "印度", flag: "🇮🇳", locale: "hi-IN", text: "चलो!", pronunciation: "恰洛", meaning: "走吧！", context: "简短、自然，像给犹豫按下开始键。", source: "印地语日常表达" },
  { id: "tr-haydi", language: "土耳其语", country: "土耳其", flag: "🇹🇷", locale: "tr-TR", text: "Haydi!", pronunciation: "嗨迪", meaning: "来吧！走起！", context: "催促和鼓励都能用，语气干脆利落。", source: "土耳其语日常表达" },
  { id: "id-semangat", language: "印尼语", country: "印度尼西亚", flag: "🇮🇩", locale: "id-ID", text: "Semangat!", pronunciation: "瑟芒阿特", meaning: "打起精神！加油！", context: "不只是加油，更像把能量直接递给对方。", source: "印尼语日常表达" },
  { id: "nl-lekker", language: "荷兰语", country: "荷兰", flag: "🇳🇱", locale: "nl-NL", text: "Lekker!", pronunciation: "莱克尔", meaning: "真棒！真香！", context: "从好吃到舒服、开心，几乎什么好事都能夸。", source: "荷兰语流行表达" },
  { id: "sv-lagom", language: "瑞典语", country: "瑞典", flag: "🇸🇪", locale: "sv-SE", text: "Lagom.", pronunciation: "拉贡", meaning: "刚刚好。", context: "不多不少的生活哲学，适合忙碌日里提醒自己。", source: "瑞典生活概念" },
  { id: "fi-sisu", language: "芬兰语", country: "芬兰", flag: "🇫🇮", locale: "fi-FI", text: "Sisu!", pronunciation: "西苏", meaning: "坚韧地撑下去！", context: "一个词装下安静、顽强、不轻言放弃的力量。", source: "芬兰文化概念" },
  { id: "sw-hakuna", language: "斯瓦希里语", country: "东非地区", flag: "🇰🇪", locale: "sw-KE", text: "Hakuna matata!", pronunciation: "哈库那 马塔塔", meaning: "别担心！", context: "旋律感很强的一句松弛提醒。", source: "斯瓦希里语流行表达" },
  { id: "el-opa", language: "希腊语", country: "希腊", flag: "🇬🇷", locale: "el-GR", text: "Ώπα!", pronunciation: "欧帕", meaning: "好耶！哎呀！", context: "庆祝、跳舞或突然惊讶时都能听见。", source: "希腊语流行表达" },
  { id: "he-sababa", language: "希伯来语", country: "以色列", flag: "🇮🇱", locale: "he-IL", text: "סבבה!", pronunciation: "萨巴巴", meaning: "没问题！很酷！", context: "一句话兼顾同意、满意和轻松。", source: "现代希伯来语俚语" },
  { id: "pl-no-dobra", language: "波兰语", country: "波兰", flag: "🇵🇱", locale: "pl-PL", text: "No dobra!", pronunciation: "诺 多布拉", meaning: "好吧，行！", context: "从小小妥协到正式开始，口语感很强。", source: "波兰语日常表达" },
  { id: "cs-to-je-ono", language: "捷克语", country: "捷克", flag: "🇨🇿", locale: "cs-CZ", text: "To je ono!", pronunciation: "托 耶 欧诺", meaning: "就是这个！", context: "终于找到正确答案时，特别有满足感。", source: "捷克语日常表达" },
  { id: "no-helt-konge", language: "挪威语", country: "挪威", flag: "🇳🇴", locale: "nb-NO", text: "Helt konge!", pronunciation: "海尔特 空耶", meaning: "简直王炸！", context: "字面是“完全像国王”，实际是在夸太棒了。", source: "挪威语俚语" },
  { id: "da-pyt-med-det", language: "丹麦语", country: "丹麦", flag: "🇩🇰", locale: "da-DK", text: "Pyt med det.", pronunciation: "皮特 麦 德", meaning: "算啦，没关系。", context: "一个帮助人放下小烦恼的丹麦式口头禅。", source: "丹麦语日常表达" },
  { id: "ms-boleh", language: "马来语", country: "马来西亚", flag: "🇲🇾", locale: "ms-MY", text: "Boleh!", pronunciation: "波雷", meaning: "可以！没问题！", context: "回应爽快，单独一句就很有亲和力。", source: "马来语日常表达" },
  { id: "tl-tara", language: "菲律宾语", country: "菲律宾", flag: "🇵🇭", locale: "fil-PH", text: "Tara!", pronunciation: "塔拉", meaning: "走吧！", context: "约朋友出门时最简短、最自然的邀请。", source: "菲律宾语日常表达" },
  { id: "uk-slava", language: "乌克兰语", country: "乌克兰", flag: "🇺🇦", locale: "uk-UA", text: "Тримайся!", pronunciation: "特里迈夏", meaning: "撑住！", context: "给处在困难中的朋友一句坚定支持。", source: "乌克兰语日常表达" },
  { id: "ro-hai", language: "罗马尼亚语", country: "罗马尼亚", flag: "🇷🇴", locale: "ro-RO", text: "Hai!", pronunciation: "嗨", meaning: "来吧！快走！", context: "只有一个音节，却能把行动立刻推起来。", source: "罗马尼亚语日常表达" },
  { id: "hu-hajra", language: "匈牙利语", country: "匈牙利", flag: "🇭🇺", locale: "hu-HU", text: "Hajrá!", pronunciation: "海拉", meaning: "加油！冲啊！", context: "赛场上很有穿透力的一声呐喊。", source: "匈牙利语体育表达" },
];

function hashDate(value: string) {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
}

export function getPhraseForDate(date: string, offset = 0) {
  return DAILY_PHRASES[(hashDate(date) + offset * 11) % DAILY_PHRASES.length];
}

export function getPhraseById(id: string) {
  return DAILY_PHRASES.find((phrase) => phrase.id === id) ?? null;
}
