// Kilo Translation App - Translation Engine

import { i18n } from './i18n.js';
import { languageMap } from './models.js';
import { isLikelyTargetLanguage, buildStrictLanguageRule, needsEnglishTranslation } from './utils.js';

// ========== Module State ==========

let currentTranslation = '';

export function getCurrentTranslation() {
    return currentTranslation;
}

export function setCurrentTranslation(value) {
    currentTranslation = value;
}

// ========== Extra Target Language Helpers ==========

const STORAGE_KEY_EXTRA_TARGETS = 'extra_target_languages';

export function getExtraTargetLanguages() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_EXTRA_TARGETS);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function setExtraTargetLanguages(langs) {
    localStorage.setItem(STORAGE_KEY_EXTRA_TARGETS, JSON.stringify(langs));
}

// ========== Translation Style Prompts ==========

const translationStylePrompts = {
    'normal': '',
    'natural': '翻譯風格要求：讓文句更自然流暢。',
    'formal': '翻譯風格要求：採用正式的商務用語。',
    'simple': '翻譯風格要求：風格要淺白，像在跟小朋友解釋一樣。',
    'academic': '翻譯風格要求：風格要適合學術人士，使用專業術語。'
};

// ========== System Prompt Generators ==========

/**
 * BigModel 翻譯提示詞生成
 * @param {string} targetLang - 目標語言代碼
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} style - 翻譯風格 (normal/natural/formal/simple/academic)
 * @param {boolean} strict - 是否啟用嚴格語言驗證
 * @param {string} interfaceLanguage - 當前介面語言
 * @returns {string} 系統提示詞
 */
export function getBigModelSystemPrompt(targetLang, sourceLang, style = 'normal', strict = false, interfaceLanguage = 'en-US') {
    const stylePrompt = translationStylePrompts[style] || '';
    const prompts = {
        'zh-TW': `你是一個專業的翻譯助手。請將${languageMap[sourceLang]}準確翻譯成${languageMap[targetLang]}。
重要規則：
1. 必須將整段內容翻譯成目標語言：${languageMap[targetLang]}
2. 保持原文的語氣和含義
3. 只返回翻譯結果，不要添加任何解釋或額外內容
4. 專有名詞、品牌名稱、人名、地名等應根據目標語言的慣例處理
5. 輸入可能包含混合語言（中英文夾雜或其他語言），請智能識別並正確翻譯
特定語言翻譯規則：
- 翻譯成日文時：請確保輸出的是正確的日文（平假名、片假名、漢字），不要翻譯成中文（簡體或繁體）
- 翻譯成韓文時：請確保輸出的是正確的韓文，不要翻譯成中文或日文
- 翻譯成繁體中文時：請確保輸出的是繁體中文，不要翻譯成簡體中文
- 翻譯成簡體中文時：請確保輸出的是簡體中文，不要翻譯成繁體中文
- 翻譯成法文時：請確保輸出的是正確的法文，包含正確的變音符號
- 翻譯成西班牙文時：請確保輸出的是正確的西班牙文，包含正確的重音符號
- 翻譯成英文時：請確保輸出的是正確的英文，不要翻譯成其他語言`,
        'zh-CN': `你是一个专业的翻译助手。请将${languageMap[sourceLang]}准确翻译成${languageMap[targetLang]}。
重要规则：
1. 必须将整段内容翻译成目标语言：${languageMap[targetLang]}
2. 保持原文的语气和含义
3. 只返回翻译结果，不要添加任何解释或额外内容
4. 专有名词、品牌名称、人名、地名等应根据目标语言的惯例处理
5. 输入可能包含混合语言（中英文夹杂或其他语言），请智能识别并正确翻译
特定语言翻译规则：
- 翻译成日文时：请确保输出的是正确的日文（平假名、片假名、汉字），不要翻译成中文（简体或繁体）
- 翻译成韩文时：请确保输出的是正确的韩文，不要翻译成中文或日文
- 翻译成繁体中文时：请确保输出的是繁体中文，不要翻译成简体中文
- 翻译成简体中文时：请确保输出的是简体中文，不要翻译成繁体中文
- 翻译成法文时：请确保输出的是正确的法文，包含正确的变音符号
- 翻译成西班牙文时：请确保输出的是正确的西班牙文，包含正确的重音符号
- 翻译成英文时：请确保输出的是正确的英文，不要翻译成其他语言`,
        'en-US': `You are a professional translation assistant. Please accurately translate user's input into ${languageMap[targetLang]}.
Important Rules:
1. Must translate entire content into target language: ${languageMap[targetLang]}
2. Maintain original tone and meaning
3. Only return translation result, do not add any explanations or additional content
4. Proper nouns, brand names, person names, place names, etc. should be processed according to target language conventions
5. The input may contain mixed languages (Chinese-English mixed or other languages), please intelligently identify and translate correctly
Specific Language Translation Rules:
- When translating to Japanese: Please ensure output is correct Japanese (hiragana, katakana, kanji), do not translate into Chinese (simplified or traditional)
- When translating to Korean: Please ensure output is correct Korean, do not translate into Chinese or Japanese
- When translating to Traditional Chinese: Please ensure output is Traditional Chinese, do not translate into Simplified Chinese
- When translating to Simplified Chinese: Please ensure output is Simplified Chinese, do not translate into Traditional Chinese
- When translating to French: Please ensure output is correct French, including correct accent marks
- When translating to Spanish: Please ensure output is correct Spanish, including correct accent marks
- When translating to English: Please ensure output is correct English, do not translate into other languages`,
        'ja-JP': `あなたはプロフェッショナルな翻訳アシスタントです。${languageMap[sourceLang]}を正確に${languageMap[targetLang]}に翻訳してください。
重要なルール：
1. 全体の内容をターゲット言語：${languageMap[targetLang]}に翻訳する必要があります
2. 原文のトーンと意味を維持してください
3. 翻訳結果のみを返し、説明や追加コンテンツを追加しないでください
4. 固有名詞、ブランド名、人名、地名などはターゲット言語の慣習に従って処理してください
5. 入力は混合言語（中国語と英語の混在や他の言語）を含む場合があるため、インテリジェントに識別して正しく翻訳してください
特定言語の翻訳ルール：
- 日本語に翻訳する場合：正しい日本語（ひらがな、カタカナ、漢字）を出力し、中国語（簡体字または繁体字）に翻訳しないでください
- 韓国語に翻訳する場合：正しい韓国語を出力し、中国語や日本語に翻訳しないでください
- 繁体字中国語に翻訳する場合：繁体字中国語を出力し、簡体字中国語に翻訳しないでください
- 簡体字中国語に翻訳する場合：簡体字中国語を出力し、繁体字中国語に翻訳しないでください
- フランス語に翻訳する場合：正しいフランス語を出力し、正しいアクセント記号を含めてください
- スペイン語に翻訳する場合：正しいスペイン語を出力し、正しいアクセント記号を含めてください
- 英語に翻訳する場合：正しい英語を出力し、他の言語に翻訳しないでください`,
        'ko-KR': `당신은 전문 번역 도우미입니다. ${languageMap[sourceLang]}를 정확하게 ${languageMap[targetLang]}로 번역하세요.
중요 규칙:
1. 전체 내용을 목표 언어: ${languageMap[targetLang]}로 번역해야 합니다
2. 원문의 어조와 의미를 유지하세요
3. 번역 결과만 반환하고, 설명이나 추가 내용을 추가하지 마세요
4. 고유명사, 브랜드명, 인명, 지명 등은 목표 언어의 관습에 따라 처리하세요
5. 입력은 혼합 언어(중국어와 영어 혼용 또는 다른 언어)를 포함할 수 있으므로, 지능적으로 식별하고 올바르게 번역하세요
특정 언어 번역 규칙:
- 일본어로 번역할 때: 올바른 일본어(히라가나, 가타카나, 한자)를 출력하고, 중국어(간체 또는 번체)로 번역하지 마세요
- 한국어로 번역할 때: 올바른 한국어를 출력하고, 중국어나 일본어로 번역하지 마세요
- 번체 중국어로 번역할 때: 번체 중국어를 출력하고, 간체 중국어로 번역하지 마세요
- 간체 중국어로 번역할 때: 간체 중국어를 출력하고, 번체 중국어로 번역하지 마세요
- 프랑스어로 번역할 때: 올바른 프랑스어를 출력하고, 올바른 악센트 기호를 포함하세요
- 스페인어로 번역할 때: 올바른 스페인어를 출력하고, 올바른 악센트 기호를 포함하세요
- 영어로 번역할 때: 올바른 영어를 출력하고, 다른 언어로 번역하지 마세요`
    };

    const prompt = prompts[interfaceLanguage] || prompts['en-US'];
    const strictRule = strict ? `\n\n${buildStrictLanguageRule(targetLang)}` : '';
    const combinedPrompt = `${prompt}${strictRule}`;
    return stylePrompt ? `${combinedPrompt}\n\n${stylePrompt}` : combinedPrompt;
}

/**
 * 根據介面語言生成翻譯提示詞 (OpenRouter 用)
 * @param {string} targetLang - 目標語言代碼
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} style - 翻譯風格
 * @param {string} interfaceLanguage - 當前介面語言
 * @returns {string} 系統提示詞
 */
export function getTranslationSystemPrompt(targetLang, sourceLang, style = 'normal', interfaceLanguage = 'en-US') {
    const stylePrompt = translationStylePrompts[style] || '';
    const prompts = {
        'zh-TW': `你是一個專業的翻譯助手。請將${languageMap[sourceLang]}準確翻譯成${languageMap[targetLang]}。

源語言識別和處理規則：
- 當輸入是日文時：正確識別日文字符（平假名、片假名、漢字），理解日文語法結構（如 SOV 語序、助詞使用等）
- 當輸入是韓文時：正確識別韓文字符，理解韓文語法結構（如 SOV 語序、助詞使用等）
- 當輸入是中文時：正確識別簡體/繁體中文，理解中文語法結構（如 SVO 語序、量詞使用等）
- 當輸入是英文時：正確識別英文，理解英文語法結構（如 SVO 語序、時態變化等）
- 當輸入是法文時：正確識別法文，理解法文語法結構（如變音符號、性數配合等）
- 當輸入是西班牙文時：正確識別西班牙文，理解西班牙文語法結構（如變音符號、性數配合等）

翻譯流程：
1. 首先識別輸入文字的源語言（${languageMap[sourceLang]}）
2. 理解源語言的語境、語法結構和含義
3. 準確翻譯成目標語言（${languageMap[targetLang]}）
4. 確保目標語言的語法、標點符號、表達方式正確

重要規則：
1. 輸入可能包含混合語言（中英文夾雜或其他語言），請智能識別並正確翻譯
2. 必須將整段內容翻譯成目標語言：${languageMap[targetLang]}
3. 保持原文的語氣和含義
4. 只返回翻譯結果，不要添加任何解釋或額外內容
5. 專有名詞、品牌名稱、人名、地名等應根據目標語言的慣例處理

混合語言處理原則：
- 如果輸入包含多種語言，請理解整體語境後翻譯成目標語言
- 不要保留原文中的其他語言，除非是專有名詞
- 例如：「I want to buy 這個產品」應翻譯成目標語言，而不是保留英文
- 例如：「這個 app 很好用」應翻譯成目標語言，而不是保留英文

特定語言翻譯規則：
- 翻譯成日文時：請確保輸出的是正確的日文（平假名、片假名、漢字），不要翻譯成中文（簡體或繁體）
- 翻譯成韓文時：請確保輸出的是正確的韓文，不要翻譯成中文或日文
- 翻譯成繁體中文時：請確保輸出的是繁體中文，不要翻譯成簡體中文
- 翻譯成簡體中文時：請確保輸出的是簡體中文，不要翻譯成繁體中文
- 翻譯成法文時：請確保輸出的是正確的法文，包含正確的變音符號
- 翻譯成西班牙文時：請確保輸出的是正確的西班牙文，包含正確的重音符號
- 翻譯成英文時：請確保輸出的是正確的英文，不要翻譯成其他語言`,
        'zh-CN': `你是一个专业的翻译助手。请将${languageMap[sourceLang]}准确翻译成${languageMap[targetLang]}。

源语言识别和处理规则：
- 当输入是日文时：正确识别日文字符（平假名、片假名、汉字），理解日文语法结构（如 SOV 语序、助词使用等）
- 当输入是韩文时：正确识别韩文字符，理解韩文语法结构（如 SOV 语序、助词使用等）
- 当输入是中文时：正确识别简体/繁体中文，理解中文语法结构（如 SVO 语序、量词使用等）
- 当输入是英文时：正确识别英文，理解英文语法结构（如 SVO 语序、时态变化等）
- 当输入是法文时：正确识别法文，理解法文语法结构（如变音符号、性数配合等）
- 当输入是西班牙文时：正确识别西班牙文，理解西班牙文语法结构（如变音符号、性数配合等）

翻译流程：
1. 首先识别输入文字的源语言（${languageMap[sourceLang]}）
2. 理解源语言的语境、语法结构和含义
3. 准确翻译成目标语言（${languageMap[targetLang]}）
4. 确保目标语言的语法、标点符号、表达方式正确

重要规则：
1. 输入可能包含混合语言（中英文夹杂或其他语言），请智能识别并正确翻译
2. 必须将整段内容翻译成目标语言：${languageMap[targetLang]}
3. 保持原文的语气和含义
4. 只返回翻译结果，不要添加任何解释或额外内容
5. 专有名词、品牌名称、人名、地名等应根据目标语言的惯例处理

混合语言处理原则：
- 如果输入包含多种语言，请理解整体语境后翻译成目标语言
- 不要保留原文中的其他语言，除非是专有名词
- 例如：「I want to buy 这个产品」应翻译成目标语言，而不是保留英文
- 例如：「这个 app 很好用」应翻译成目标语言，而不是保留英文

特定语言翻译规则：
- 翻译成日文时：请确保输出的是正确的日文（平假名、片假名、汉字），不要翻译成中文（简体或繁体）
- 翻译成韩文时：请确保输出的是正确的韩文，不要翻译成中文或日文
- 翻译成繁体中文时：请确保输出的是繁体中文，不要翻译成简体中文
- 翻译成简体中文时：请确保输出的是简体中文，不要翻译成繁体中文
- 翻译成法文时：请确保输出的是正确的法文，包含正确的变音符号
- 翻译成西班牙文时：请确保输出的是正确的西班牙文，包含正确的重音符号
- 翻译成英文时：请确保输出的是正确的英文，不要翻译成其他语言`,
        'en-US': `You are a professional translation assistant. Please accurately translate the user's input into ${languageMap[targetLang]}.

Important Rules:
1. The input may contain mixed languages (Chinese-English mixed or other languages), please intelligently identify and translate correctly
2. Must translate the entire content into the target language: ${languageMap[targetLang]}
3. Maintain the original tone and meaning
4. Only return the translation result, do not add any explanations or additional content
5. Proper nouns, brand names, person names, place names, etc. should be processed according to the target language conventions

Mixed Language Processing Principles:
- If the input contains multiple languages, please understand the overall context and translate into the target language
- Do not retain other languages in the original text unless they are proper nouns
- Example: "I want to buy 這個產品" should be translated into the target language, not retaining English
- Example: "這個 app 很好用" should be translated into the target language, not retaining English

Specific Language Translation Rules:
- When translating to Japanese: Please ensure the output is correct Japanese (hiragana, katakana, kanji), do not translate into Chinese (simplified or traditional)
- When translating to Korean: Please ensure the output is correct Korean, do not translate into Chinese or Japanese
- When translating to Traditional Chinese: Please ensure the output is Traditional Chinese, do not translate into Simplified Chinese
- When translating to Simplified Chinese: Please ensure the output is Simplified Chinese, do not translate into Traditional Chinese
- When translating to French: Please ensure the output is correct French, including correct accent marks
- When translating to Spanish: Please ensure the output is correct Spanish, including correct accent marks
- When translating to English: Please ensure the output is correct English, do not translate into other languages`,
        'ja-JP': `あなたはプロフェッショナルな翻訳アシスタントです。${languageMap[sourceLang]}を正確に${languageMap[targetLang]}に翻訳してください。

ソース言語の認識と処理ルール：
- 入力が日本語の場合：日本語の文字（ひらがな、カタカナ、漢字）を正しく認識し、日本語の文法構造（SOV語順、助詞の使用など）を理解してください
- 入力が韓国語の場合：韓国語の文字を正しく認識し、韓国語の文法構造（SOV語順、助詞の使用など）を理解してください
- 入力が中国語の場合：簡体字/繁体字中国語を正しく認識し、中国語の文法構造（SVO語順、量詞の使用など）を理解してください
- 入力が英語の場合：英語を正しく認識し、英語の文法構造（SVO語順、時制の変化など）を理解してください
- 入力がフランス語の場合：フランス語を正しく認識し、フランス語の文法構造（アクセント記号、性数一致など）を理解してください
- 入力がスペイン語の場合：スペイン語を正しく認識し、スペイン語の文法構造（アクセント記号、性数一致など）を理解してください

翻訳プロセス：
1. まず入力テキストのソース言語（${languageMap[sourceLang]}）を認識する
2. ソース言語の文脈、文法構造、意味を理解する
3. ターゲット言語（${languageMap[targetLang]}）に正確に翻訳する
4. ターゲット言語の文法、句読点、表現が正しいことを確認する

重要なルール：
1. 入力は混合言語（中国語と英語の混在や他の言語）を含む場合があるため、インテリジェントに識別して正しく翻訳してください
2. 全体の内容をターゲット言語：${languageMap[targetLang]}に翻訳する必要があります
3. 原文のトーンと意味を維持してください
4. 翻訳結果のみを返し、説明や追加コンテンツを追加しないでください
5. 固有名詞、ブランド名、人名、地名などはターゲット言語の慣習に従って処理してください

混合言語処理の原則：
- 入力に複数の言語が含まれる場合、全体の文脈を理解してターゲット言語に翻訳してください
- 固有名詞でない限り、原文の他の言語を保持しないでください
- 例：「I want to buy 這個產品」はターゲット言語に翻訳し、英語を保持しないでください
- 例：「這個 app 很好用」はターゲット言語に翻訳し、英語を保持しないでください

特定言語の翻訳ルール：
- 日本語に翻訳する場合：正しい日本語（ひらがな、カタカナ、漢字）を出力し、中国語（簡体字または繁体字）に翻訳しないでください
- 韓国語に翻訳する場合：正しい韓国語を出力し、中国語や日本語に翻訳しないでください
- 繁体字中国語に翻訳する場合：繁体字中国語を出力し、簡体字中国語に翻訳しないでください
- 簡体字中国語に翻訳する場合：簡体字中国語を出力し、繁体字中国語に翻訳しないでください
- フランス語に翻訳する場合：正しいフランス語を出力し、正しいアクセント記号を含めてください
- スペイン語に翻訳する場合：正しいスペイン語を出力し、正しいアクセント記号を含めてください
- 英語に翻訳する場合：正しい英語を出力し、他の言語に翻訳しないでください`,
        'ko-KR': `당신은 전문 번역 도우미입니다. ${languageMap[sourceLang]}를 정확하게 ${languageMap[targetLang]}로 번역하세요.

소스 언어 인식 및 처리 규칙:
- 입력이 일본어인 경우: 일본어 문자(히라가나, 가타카나, 한자)를 올바르게 인식하고, 일본어 문법 구조(SOV 어순, 조사 사용 등)를 이해하세요
- 입력이 한국어인 경우: 한국어 문자를 올바르게 인식하고, 한국어 문법 구조(SOV 어순, 조사 사용 등)를 이해하세요
- 입력이 중국어인 경우: 간체/번체 중국어를 올바르게 인식하고, 중국어 문법 구조(SVO 어순, 양사 사용 등)를 이해하세요
- 입력이 영어인 경우: 영어를 올바르게 인식하고, 영어 문법 구조(SVO 어순, 시제 변화 등)를 이해하세요
- 입력이 프랑스어인 경우: 프랑스어를 올바르게 인식하고, 프랑스어 문법 구조(악센트 기호, 성수 일치 등)를 이해하세요
- 입력이 스페인어인 경우: 스페인어를 올바르게 인식하고, 스페인어 문법 구조(악센트 기호, 성수 일치 등)를 이해하세요

번역 프로세스:
1. 먼저 입력 텍스트의 소스 언어(${languageMap[sourceLang]})를 인식하세요
2. 소스 언어의 문맥, 문법 구조, 의미를 이해하세요
3. 목표 언어(${languageMap[targetLang]})로 정확하게 번역하세요
4. 목표 언어의 문법, 문장 부호, 표현이 올바른지 확인하세요

중요 규칙:
1. 입력은 혼합 언어(중국어와 영어 혼용 또는 다른 언어)를 포함할 수 있으므로, 지능적으로 식별하고 올바르게 번역하세요
2. 전체 내용을 목표 언어: ${languageMap[targetLang]}로 번역해야 합니다
3. 원문의 어조와 의미를 유지하세요
4. 번역 결과만 반환하고, 설명이나 추가 내용을 추가하지 마세요
5. 고유명사, 브랜드명, 인명, 지명 등은 목표 언어의 관습에 따라 처리하세요

혼합 언어 처리 원칙:
- 입력에 여러 언어가 포함된 경우, 전체 문맥을 이해하고 목표 언어로 번역하세요
- 고유명사가 아닌 한 원문의 다른 언어를 유지하지 마세요
- 예: "I want to buy 這個產品"은 목표 언어로 번역하고 영어를 유지하지 마세요
- 예: "這個 app 很好用"은 목표 언어로 번역하고 영어를 유지하지 마세요

특정 언어 번역 규칙:
- 일본어로 번역할 때: 올바른 일본어(히라가나, 가타카나, 한자)를 출력하고, 중국어(간체 또는 번체)로 번역하지 마세요
- 한국어로 번역할 때: 올바른 한국어를 출력하고, 중국어나 일본어로 번역하지 마세요
- 번체 중국어로 번역할 때: 번체 중국어를 출력하고, 간체 중국어로 번역하지 마세요
- 간체 중국어로 번역할 때: 간체 중국어를 출력하고, 번체 중국어로 번역하지 마세요
- 프랑스어로 번역할 때: 올바른 프랑스어를 출력하고, 올바른 악센트 기호를 포함하세요
- 스페인어로 번역할 때: 올바른 스페인어를 출력하고, 올바른 악센트 기호를 포함하세요
- 영어로 번역할 때: 올바른 영어를 출력하고, 다른 언어로 번역하지 마세요`
    };

    const prompt = prompts[interfaceLanguage] || prompts['en-US'];
    return stylePrompt ? `${prompt}\n\n${stylePrompt}` : prompt;
}

const BACKEND_TRANSLATE_ENDPOINTS = ['/api/translate', '/.netlify/functions/translate'];

async function postTranslate(requestBody, signal) {
    let lastError = null;
    for (const endpoint of BACKEND_TRANSLATE_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal
            });
            if (response.status === 404 && endpoint !== BACKEND_TRANSLATE_ENDPOINTS[BACKEND_TRANSLATE_ENDPOINTS.length - 1]) {
                lastError = new Error('endpoint-missing');
                continue;
            }
            return response;
        } catch (error) {
            if (error?.message === 'endpoint-missing') {
                lastError = error;
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error('找不到翻譯服務端點');
}

/**
 * Unified SSE stream response handler.
 * Replaces the 5 duplicate handlers from the original code:
 * - handleBigModelStreamResponse
 * - handleStreamResponse
 * - handleNetlifyStreamResponse
 * - handleNetlifyStandardResponse
 * - handleStandardResponse
 *
 * @param {Response} response - fetch Response object
 * @param {HTMLElement|null} targetElement - DOM element to update progressively (optional)
 * @param {object} options
 * @param {boolean}  options.isSSE      - true for SSE/streaming, false for standard JSON
 * @param {boolean}  options.returnOnly - true to return result without setting module currentTranslation
 * @param {function} options.onComplete - callback(fullText) when done
 * @param {function} options.onError    - callback(error) on failure
 * @returns {Promise<string>} the complete translated text
 */
export async function handleStreamResponse(response, targetElement = null, options = {}) {
    const { isSSE = true, returnOnly = false, onComplete, onError } = options;

    try {
        if (!isSSE) {
            // ---------- Standard JSON response ----------
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('伺服器返回的數據格式錯誤');
            }

            if (!returnOnly) {
                currentTranslation = content;
            }
            if (targetElement) {
                targetElement.textContent = content;
            }
            if (onComplete) onComplete(content);
            return content;
        }

        // ---------- SSE / streaming response ----------
        // Some Netlify responses return the full text directly (no SSE framing)
        const contentType = response.headers.get('content-type') || '';
        if (!response.body || contentType.includes('text/plain')) {
            const streamText = await response.text();
            if (!streamText) {
                throw new Error('伺服器未返回有效的翻譯結果');
            }
            if (!returnOnly) {
                currentTranslation = streamText;
            }
            if (targetElement) {
                targetElement.textContent = streamText;
            }
            if (onComplete) onComplete(streamText);
            return streamText;
        }

        // True SSE: parse "data: {...}" lines
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) {
                            accumulated += content;
                            if (targetElement) {
                                targetElement.textContent = accumulated;
                                targetElement.scrollTop = targetElement.scrollHeight;
                            }
                        }
                    } catch (e) {
                        console.warn('解析流式數據錯誤:', e, 'Data:', data);
                    }
                }
            }
        }

        if (!returnOnly) {
            currentTranslation = accumulated;
        }
        if (onComplete) onComplete(accumulated);
        return accumulated;

    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
}

// ========== Core Translation Dispatcher ==========

/**
 * 執行翻譯 - 核心分派器
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} elements - DOM 元素引用 { aiModel, customModelInput, streamMode, serverApiKey, bigmodelApiKey, apiKey }
 * @param {object} options - 選項
 * @param {string} options.interfaceLanguage - 當前介面語言
 * @returns {Promise<string>} 翻譯結果文字
 */
export async function performTranslation(text, sourceLang, targetLang, elements, options = {}) {
    const { interfaceLanguage = 'en-US' } = options;
    const translationService = localStorage.getItem('translation_service') || 'openrouter';
    const isStreamMode = elements.streamMode.checked;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    // 獲取選擇的翻譯風格
    const style = document.querySelector('input[name="translationStyle"]:checked')?.value || 'normal';

    try {
        const translations = i18n[interfaceLanguage];
        let selectedModel = elements.aiModel.value;

        if (selectedModel === 'custom') {
            selectedModel = elements.customModelInput.value.trim();
            if (!selectedModel) {
                throw new Error(translations.enterCustomModelId || '請輸入自定義模型 ID');
            }
        }

        if (translationService === 'bigmodel') {
            // BigModel 走 Netlify Function 代理（JWT 須在伺服端產生）
            return await translateWithBigModelServerDirect(text, sourceLang, targetLang, {
                selectedModel,
                controller,
                timeoutId,
                isStreamMode,
                style
            });
        } else {
            // 使用 OpenRouter API
            const useServerApiKey = elements.serverApiKey.checked;
            if (useServerApiKey) {
                return await translateWithServerAPIDirect(text, sourceLang, targetLang, {
                    selectedModel,
                    controller,
                    timeoutId,
                    style
                });
            } else {
                return await translateWithClientAPIDirect(text, sourceLang, targetLang, elements, {
                    selectedModel,
                    controller,
                    timeoutId,
                    style,
                    interfaceLanguage
                });
            }
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

// ========== Direct API Translation Functions (return text) ==========

/**
 * 使用伺服器端 API 金鑰直接翻譯（返回翻譯結果）
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} opts - { selectedModel, controller, timeoutId, style }
 * @returns {Promise<string>}
 */
export async function translateWithServerAPIDirect(text, sourceLang, targetLang, opts = {}) {
    const { selectedModel, controller, timeoutId, style = 'normal' } = opts;

    const requestBody = {
        text,
        sourceLang,
        targetLang,
        model: selectedModel,
        stream: false,
        style
    };

    const response = await postTranslate(requestBody, controller.signal);

    clearTimeout(timeoutId);

    if (!response.ok) {
        let errorMessage = `翻譯服務請求失敗: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.error || response.statusText}`;
        } catch (e) {
            errorMessage += ` - ${response.statusText}`;
        }

        if (response.status === 404) {
            errorMessage = '找不到翻譯服務端點。若你在本機開發，請先啟動後端（`npm start` 或 `netlify dev`），或切換到「自行輸入 API 金鑰」模式。';
        }

        throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    const content = data.choices?.[0]?.message?.content;
    if (content) {
        return content;
    } else {
        throw new Error('伺服器返回的數據格式錯誤');
    }
}

/**
 * 透過後端代理使用 BigModel API（JWT 由伺服端產生）
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} opts - { selectedModel, controller, timeoutId, isStreamMode, style }
 * @returns {Promise<string>}
 */
export async function translateWithBigModelServerDirect(text, sourceLang, targetLang, opts = {}) {
    const { selectedModel, controller, timeoutId, isStreamMode = false, style = 'normal' } = opts;

    const requestBody = {
        text,
        sourceLang,
        targetLang,
        model: selectedModel,
        stream: isStreamMode,
        style,
        service: 'bigmodel'
    };

    const response = await postTranslate(requestBody, controller.signal);

    clearTimeout(timeoutId);

    if (!response.ok) {
        let errorMessage = `BigModel 翻譯服務請求失敗: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.error || response.statusText}`;
        } catch (e) {
            errorMessage += ` - ${response.statusText}`;
        }
        if (response.status === 404) {
            errorMessage = '找不到翻譯服務端點。若你在本機開發，請先啟動後端（`npm start` 或 `netlify dev`）。';
        }
        throw new Error(errorMessage);
    }

    // 伺服端回傳 text/plain (stream) 或 application/json (standard)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/plain')) {
        const content = await response.text();
        if (!content) throw new Error('伺服器未返回有效的翻譯結果');
        return content;
    } else {
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('伺服器返回的數據格式錯誤');
        return content;
    }
}

/**
 * 使用用戶端 API 金鑰直接翻譯（返回翻譯結果）
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} elements - DOM 元素引用 { apiKey }
 * @param {object} opts - { selectedModel, controller, timeoutId, style, interfaceLanguage }
 * @returns {Promise<string>}
 */
export async function translateWithClientAPIDirect(text, sourceLang, targetLang, elements, opts = {}) {
    const { selectedModel, controller, timeoutId, style = 'normal', interfaceLanguage = 'en-US' } = opts;
    const translations = i18n[interfaceLanguage];
    const apiKey = elements.apiKey.value.trim();

    if (!apiKey) {
        throw new Error(translations.enterApiKey || '請輸入 OpenRouter API 金鑰');
    }

    const requestBody = {
        model: selectedModel,
        messages: [
            {
                role: 'system',
                content: getTranslationSystemPrompt(targetLang, sourceLang, style, interfaceLanguage)
            },
            {
                role: 'user',
                content: text
            }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: false
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Kilo Translation App'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        let errorMessage = `OpenRouter API 請求失敗: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.error?.message || response.statusText}`;
        } catch (e) {
            errorMessage += ` - ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
        return content;
    } else {
        throw new Error('伺服器返回的數據格式錯誤');
    }
}

/**
 * 使用 BigModel API 金鑰直接翻譯（返回翻譯結果，含語言驗證重試）
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} elements - DOM 元素引用 { bigmodelApiKey, targetText }
 * @param {object} opts - { selectedModel, controller, timeoutId, isStreamMode, style, interfaceLanguage, strict }
 * @returns {Promise<string>}
 */
export async function translateWithBigModelDirect(text, sourceLang, targetLang, elements, opts = {}) {
    const {
        selectedModel,
        controller,
        timeoutId,
        isStreamMode = false,
        style = 'normal',
        interfaceLanguage = 'en-US',
        strict = false
    } = opts;
    const translations = i18n[interfaceLanguage];
    const apiKey = elements.bigmodelApiKey.value.trim();

    if (!apiKey) {
        throw new Error(translations.enterBigModelApiKey || '請輸入 BigModel API 金鑰');
    }

    const requestBody = {
        model: selectedModel,
        messages: [
            {
                role: 'system',
                content: getBigModelSystemPrompt(targetLang, sourceLang, style, strict, interfaceLanguage)
            },
            {
                role: 'user',
                content: text
            }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: isStreamMode
    };

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        let errorMessage = `BigModel API 請求失敗: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.error?.message || errorData.message || response.statusText}`;
        } catch (e) {
            errorMessage += ` - ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    if (isStreamMode) {
        // 流式處理 - use unified handler, return result only
        const targetEl = elements.targetText || null;
        const streamResult = await handleStreamResponse(response, targetEl, {
            isSSE: true,
            returnOnly: true
        });

        // 語言驗證重試邏輯
        if (!strict && !isLikelyTargetLanguage(streamResult, targetLang)) {
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 35000);
            return await translateWithBigModelDirect(
                text, sourceLang, targetLang, elements,
                {
                    selectedModel,
                    controller: retryController,
                    timeoutId: retryTimeoutId,
                    isStreamMode: false,
                    style,
                    interfaceLanguage,
                    strict: true
                }
            );
        }
        return streamResult;
    } else {
        // 標準處理
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (content) {
            // 語言驗證重試邏輯
            if (!strict && !isLikelyTargetLanguage(content, targetLang)) {
                const retryController = new AbortController();
                const retryTimeoutId = setTimeout(() => retryController.abort(), 35000);
                return await translateWithBigModelDirect(
                    text, sourceLang, targetLang, elements,
                    {
                        selectedModel,
                        controller: retryController,
                        timeoutId: retryTimeoutId,
                        isStreamMode: false,
                        style,
                        interfaceLanguage,
                        strict: true
                    }
                );
            }
            return content;
        } else {
            throw new Error('伺服器返回的數據格式錯誤');
        }
    }
}

// ========== UI-Updating Translation Functions ==========

/**
 * 使用 OpenRouter API 翻譯（更新 DOM 元素）
 * @param {string} text - 要翻譯的文字
 * @param {object} elements - DOM 元素引用 { aiModel, customModelInput, streamMode, serverApiKey, apiKey, targetText }
 * @param {object} state - { sourceLang, targetLang, style, interfaceLanguage }
 * @returns {Promise<void>}
 */
export async function translateWithOpenRouter(text, elements, state = {}) {
    const { sourceLang, targetLang, style = 'normal', interfaceLanguage = 'en-US' } = state;
    const isStreamMode = elements.streamMode.checked;
    const useServerApiKey = elements.serverApiKey.checked;

    if (isStreamMode) {
        elements.targetText.classList.add('streaming');
    }

    // 設定請求超時
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
        const translations = i18n[interfaceLanguage];
        let selectedModel = elements.aiModel.value;

        if (selectedModel === 'custom') {
            selectedModel = elements.customModelInput.value.trim();
            if (!selectedModel) {
                throw new Error(translations.enterCustomModelId || '請輸入自定義模型 ID');
            }
        }

        if (useServerApiKey) {
            // 使用伺服器端 API 金鑰，通過 Netlify Functions
            await translateWithServerAPI(text, sourceLang, targetLang, elements, {
                selectedModel,
                isStreamMode,
                controller,
                timeoutId,
                style
            });
        } else {
            // 使用用戶端 API 金鑰，直接調用 OpenRouter API
            await translateWithClientAPI(text, sourceLang, targetLang, elements, {
                selectedModel,
                isStreamMode,
                controller,
                timeoutId,
                style,
                interfaceLanguage
            });
        }
    } catch (error) {
        clearTimeout(timeoutId);

        let errorMessage = '翻譯服務失敗: ';
        if (error.name === 'AbortError') {
            errorMessage += '請求超時，請檢查網路連線';
        } else if (useServerApiKey && (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('找不到翻譯服務端點'))) {
            errorMessage += '找不到伺服器翻譯端點。請確認後端已啟動（Zeabur 部署或本機 `npm start`），或切換到「自行輸入 API 金鑰」模式。';
        } else if (error.message.includes('401') || error.message.includes('API key')) {
            if (useServerApiKey) {
                errorMessage += '伺服器 API 配置錯誤，請聯繫管理員';
            } else {
                errorMessage += 'API 金鑰無效，請檢查您的 API 金鑰';
            }
        } else if (error.message.includes('429')) {
            errorMessage += 'API 請求過於頻繁，請稍後再試';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += '網路連線錯誤，請檢查網路狀態';
        } else {
            errorMessage += error.message;
        }

        throw new Error(errorMessage);
    }
}

/**
 * 使用伺服器端 API 金鑰翻譯（通過 Netlify Functions，更新 DOM）
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} elements - DOM 元素引用 { targetText }
 * @param {object} opts - { selectedModel, isStreamMode, controller, timeoutId, style }
 * @returns {Promise<void>}
 */
export async function translateWithServerAPI(text, sourceLang, targetLang, elements, opts = {}) {
    const { selectedModel, isStreamMode, controller, timeoutId, style = 'normal' } = opts;

    const requestBody = {
        text,
        sourceLang,
        targetLang,
        model: selectedModel,
        stream: isStreamMode,
        style
    };

    // 調用後端翻譯服務（Zeabur /api/translate，兼容 Netlify Function）
    const response = await postTranslate(requestBody, controller.signal);

    clearTimeout(timeoutId);

    if (!response.ok) {
        let errorMessage = `翻譯服務請求失敗: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.error || response.statusText}`;
        } catch (e) {
            errorMessage += ` - ${response.statusText}`;
        }

        if (response.status === 404) {
            errorMessage = '找不到翻譯服務端點。若你在本機開發，請先啟動後端（`npm start` 或 `netlify dev`），或切換到「自行輸入 API 金鑰」模式。';
        }

        throw new Error(errorMessage);
    }

    if (isStreamMode) {
        // 流式處理 (Netlify may return plain text)
        await handleStreamResponse(response, elements.targetText, { isSSE: true });
    } else {
        // 標準處理
        await handleStreamResponse(response, elements.targetText, { isSSE: false });
    }
}

/**
 * 使用用戶端 API 金鑰翻譯（直接調用 OpenRouter API，更新 DOM）
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} elements - DOM 元素引用 { apiKey, targetText }
 * @param {object} opts - { selectedModel, isStreamMode, controller, timeoutId, style, interfaceLanguage }
 * @returns {Promise<void>}
 */
export async function translateWithClientAPI(text, sourceLang, targetLang, elements, opts = {}) {
    const { selectedModel, isStreamMode, controller, timeoutId, style = 'normal', interfaceLanguage = 'en-US' } = opts;
    const translations = i18n[interfaceLanguage];
    const apiKey = elements.apiKey.value.trim();

    if (!apiKey) {
        throw new Error(translations.enterApiKey || '請輸入 OpenRouter API 金鑰');
    }

    // 構建 OpenRouter API 請求
    const requestBody = {
        model: selectedModel,
        messages: [
            {
                role: 'system',
                content: getTranslationSystemPrompt(targetLang, sourceLang, style, interfaceLanguage)
            },
            {
                role: 'user',
                content: text
            }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: isStreamMode
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Kilo Translation App'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        let errorMessage = `OpenRouter API 請求失敗: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.error?.message || response.statusText}`;
        } catch (e) {
            errorMessage += ` - ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    if (isStreamMode) {
        // 流式處理
        await handleStreamResponse(response, elements.targetText, { isSSE: true });
    } else {
        // 標準處理
        await handleStreamResponse(response, elements.targetText, { isSSE: false });
    }
}

// ========== Fallback & High-Level Entry Points ==========

/**
 * 使用瀏覽器內建翻譯（簡單字典映射 fallback）
 * @param {string} text - 要翻譯的文字
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @param {object} elements - DOM 元素引用 { targetText }
 * @returns {Promise<void>}
 */
export async function translateWithBrowser(text, sourceLang, targetLang, elements) {
    // 模擬翻譯延遲
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 簡單的翻譯映射（僅作為示範）
    const simpleTranslations = {
        'zh-TW': {
            'en-US': {
                '你好': 'Hello',
                '謝謝': 'Thank you',
                '再見': 'Goodbye',
                '是的': 'Yes',
                '不是': 'No'
            }
        },
        'en-US': {
            'zh-TW': {
                'hello': '你好',
                'thank you': '謝謝',
                'goodbye': '再見',
                'yes': '是的',
                'no': '不是'
            }
        }
    };

    const sourceMap = simpleTranslations[sourceLang]?.[targetLang] || {};
    const lowerText = text.toLowerCase().trim();

    // 嘗試找到匹配的翻譯
    let translation = sourceMap[lowerText] || text;

    // 如果沒有找到精確匹配，返回原文並提示
    if (translation === text) {
        translation = `[瀏覽器翻譯] ${text}\n\n注意：瀏覽器內建翻譯功能有限，建議使用 OpenRouter API 獲得更好的翻譯品質。`;
    }

    currentTranslation = translation;
    if (elements.targetText) {
        elements.targetText.textContent = currentTranslation;
    }
}

/**
 * 雙人模式翻譯入口
 * @param {string} text - 要翻譯的文字
 * @param {object} elements - DOM 元素引用 { sourceLanguage, targetLanguage, dualTargetText, englishText, streamMode, aiModel, customModelInput, serverApiKey, bigmodelApiKey, apiKey, playTranslation }
 * @param {object} state - { currentUser, interfaceLanguage, updateStatus, showError, hideError, addToHistoryInDualMode }
 * @returns {Promise<void>}
 */
export async function translateTextInDualMode(text, elements, state = {}) {
    const {
        currentUser = 'A',
        interfaceLanguage = 'en-US',
        updateStatus,
        showError,
        hideError,
        addToHistoryInDualMode
    } = state;

    let sourceLang, targetLang;
    const translations = i18n[interfaceLanguage];
    const translationService = localStorage.getItem('translation_service') || 'openrouter';

    if (currentUser === 'A') {
        sourceLang = elements.sourceLanguage.value;
        targetLang = elements.targetLanguage.value;
    } else {
        sourceLang = elements.targetLanguage.value;
        targetLang = elements.sourceLanguage.value;
    }

    // 檢查文字長度
    if (text.trim().length === 0) {
        if (showError) showError(translations.noContentToTranslate || '沒有可翻譯的內容');
        return;
    }

    if (text.length > 5000) {
        if (showError) showError(translations.textTooLong || '文字過長，請分段輸入（建議不超過 5000 字元）');
        return;
    }

    if (updateStatus) updateStatus('translating', translations.translating || '正在翻譯...');
    elements.dualTargetText.textContent = '';
    elements.englishText.textContent = '';

    // 設置流式模式樣式
    if (translationService === 'bigmodel' && elements.streamMode.checked) {
        elements.dualTargetText.classList.add('streaming');
    }

    let englishTranslation = '';

    try {
        let finalTranslation;

        const bypassEnglish = localStorage.getItem('bypass_english_step') === 'true';

        if (!bypassEnglish && needsEnglishTranslation(sourceLang, targetLang)) {
            // 雙步驟翻譯：來源 → 英語 → 目標
            elements.englishText.textContent = translations.translating || '翻譯中...';

            // 第一步：來源語言 → 英語
            const englishResult = await performTranslation(text, sourceLang, 'en-US', elements, { interfaceLanguage });
            englishTranslation = englishResult;
            elements.englishText.textContent = englishTranslation;

            // 第二步：英語 → 目標語言
            finalTranslation = await performTranslation(englishTranslation, 'en-US', targetLang, elements, { interfaceLanguage });
        } else {
            // 直接翻譯
            finalTranslation = await performTranslation(text, sourceLang, targetLang, elements, { interfaceLanguage });
            elements.englishText.textContent = translations.noEnglishReference || '不需要英語參考';
        }

        // 翻譯完成
        elements.dualTargetText.textContent = finalTranslation;
        elements.dualTargetText.classList.remove('streaming');
        elements.playTranslation.disabled = false;
        if (updateStatus) updateStatus('ready', translations.translationComplete || '翻譯完成');

        // 檢查翻譯結果
        if (finalTranslation.trim().length === 0) {
            if (showError) showError(translations.translationEmpty || '翻譯結果為空，請重試');
            return;
        }

        // 添加到歷史記錄
        if (addToHistoryInDualMode) {
            addToHistoryInDualMode(text, finalTranslation, sourceLang, targetLang, englishTranslation);
        }

    } catch (error) {
        console.error('翻譯錯誤:', error);
        if (showError) showError(`${translations.translationFailed || '翻譯失敗'}: ${error.message}`);
        if (updateStatus) updateStatus('error', translations.translationFailed || '翻譯失敗');
    }
}

/**
 * 單人模式翻譯入口
 * @param {string} text - 要翻譯的文字
 * @param {object} elements - DOM 元素引用 { sourceLanguage, targetLanguage, targetText, englishTextSingle, streamMode, aiModel, customModelInput, serverApiKey, bigmodelApiKey, apiKey, playTranslation }
 * @param {object} state - { interfaceLanguage, updateStatus, showError, hideError, addToHistory }
 * @returns {Promise<void>}
 */
export async function translateText(text, elements, state = {}) {
    const {
        interfaceLanguage = 'en-US',
        updateStatus,
        showError,
        addToHistory
    } = state;

    const sourceLang = elements.sourceLanguage.value;
    const targetLang = elements.targetLanguage.value;
    const translations = i18n[interfaceLanguage];

    // 檢查文字長度
    if (text.trim().length === 0) {
        if (showError) showError(translations.noContentToTranslate || '沒有可翻譯的內容');
        return;
    }

    if (text.length > 5000) {
        if (showError) showError(translations.textTooLong || '文字過長，請分段輸入（建議不超過 5000 字元）');
        return;
    }

    if (updateStatus) updateStatus('translating', translations.translating || '正在翻譯...');
    elements.targetText.textContent = '';
    elements.englishTextSingle.textContent = '';

    // 設置流式模式樣式
    const translationService = localStorage.getItem('translation_service') || 'openrouter';
    if (translationService === 'bigmodel' && elements.streamMode.checked) {
        elements.targetText.classList.add('streaming');
    }

    try {
        let finalTranslation;
        let englishRef = '';

        const bypassEnglish = localStorage.getItem('bypass_english_step') === 'true';

        if (!bypassEnglish && needsEnglishTranslation(sourceLang, targetLang)) {
            // 雙步驟翻譯：來源 → 英語 → 目標
            elements.englishTextSingle.textContent = translations.translating || '翻譯中...';

            // 第一步：來源語言 → 英語
            const englishResult = await performTranslation(text, sourceLang, 'en-US', elements, { interfaceLanguage });
            englishRef = englishResult;
            elements.englishTextSingle.textContent = englishRef;

            // 第二步：英語 → 目標語言
            finalTranslation = await performTranslation(englishRef, 'en-US', targetLang, elements, { interfaceLanguage });
        } else {
            // 直接翻譯
            finalTranslation = await performTranslation(text, sourceLang, targetLang, elements, { interfaceLanguage });
            elements.englishTextSingle.textContent = translations.noEnglishReference || '不需要英語參考';
        }

        // 翻譯完成
        elements.targetText.textContent = finalTranslation;
        elements.targetText.classList.remove('streaming');
        elements.playTranslation.disabled = false;
        if (updateStatus) updateStatus('ready', translations.translationComplete || '翻譯完成');

        // 檢查翻譯結果
        if (finalTranslation.trim().length === 0) {
            if (showError) showError(translations.translationEmpty || '翻譯結果為空，請重試');
            return;
        }

        // 添加到歷史記錄
        if (addToHistory) {
            addToHistory(text, finalTranslation, sourceLang, targetLang, englishRef);
        }

        // ========== 額外目標語言的平行翻譯 ==========
        const extraTargets = getExtraTargetLanguages().filter(lang => lang !== targetLang);
        if (extraTargets.length > 0) {
            const container = document.getElementById('additionalTranslations');
            if (container) {
                container.classList.remove('hidden');

                // 決定平行翻譯的輸入：有英文步驟就用英文結果，否則用原文
                const hasEnglishStep = !bypassEnglish && needsEnglishTranslation(sourceLang, targetLang);
                const extraInput = hasEnglishStep ? englishRef : text;
                const extraSourceLang = hasEnglishStep ? 'en-US' : sourceLang;

                // 建立每個額外語言的結果框
                container.innerHTML = extraTargets.map(lang => `
                    <div class="transcript-box" data-extra-lang="${lang}">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            <span>${languageMap[lang] || lang}</span>
                        </h3>
                        <div class="transcript-content streaming">${translations.translating || '翻譯中...'}</div>
                    </div>
                `).join('');

                // 平行發送 API 請求
                const results = await Promise.allSettled(
                    extraTargets.map(extraLang =>
                        performTranslation(extraInput, extraSourceLang, extraLang, elements, { interfaceLanguage })
                    )
                );

                // 填入結果
                results.forEach((result, i) => {
                    const contentEl = container.querySelector(`[data-extra-lang="${extraTargets[i]}"] .transcript-content`);
                    if (contentEl) {
                        contentEl.classList.remove('streaming');
                        if (result.status === 'fulfilled') {
                            contentEl.textContent = result.value;
                        } else {
                            contentEl.textContent = `❌ ${result.reason.message}`;
                        }
                    }
                });
            }
        }

    } catch (error) {
        console.error('翻譯錯誤:', error);
        if (showError) showError(`${translations.translationFailed || '翻譯失敗'}: ${error.message}`);
        elements.targetText.classList.remove('streaming');
        if (updateStatus) updateStatus('error', translations.translationFailed || '翻譯失敗');
    }
}
