/**
 * BigModel API 集成測試文件
 * 
 * 此文件用於測試 BigModel API 的基本功能
 * 
 * 使用方法：
 * 1. 在瀏覽器控制台中運行
 * 2. 或使用 Node.js 運行（需要安裝 node-fetch）
 * 
 * 注意：需要有效的 BigModel API 金鑰
 */

// 測試配置
const TEST_CONFIG = {
  apiKey: '', // 請在此處填入您的 BigModel API 金鑰
  apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  model: 'glm-4-flash',
  temperature: 0.3,
  maxTokens: 2000
};

// 支援的 BigModel 模型列表
const BIGMODEL_MODELS = {
  // GLM-4 系列（最新一代）
  'glm-4-flash': {
    name: 'GLM-4 Flash',
    description: '快速響應模型，適合實時翻譯，推薦使用',
    category: '推薦',
    maxTokens: 128000,
    contextWindow: 128000
  },
  'glm-4': {
    name: 'GLM-4',
    description: '標準模型，平衡性能與成本',
    category: '標準',
    maxTokens: 128000,
    contextWindow: 128000
  },
  'glm-4-air': {
    name: 'GLM-4 Air',
    description: '輕量級模型，快速響應',
    category: '輕量級',
    maxTokens: 128000,
    contextWindow: 128000
  },
  'glm-4-airx': {
    name: 'GLM-4 AirX',
    description: '超輕量級模型，極速響應',
    category: '超輕量級',
    maxTokens: 128000,
    contextWindow: 128000
  },
  'glm-4-plus': {
    name: 'GLM-4 Plus',
    description: '增強版模型，更高品質翻譯',
    category: '高品質',
    maxTokens: 128000,
    contextWindow: 128000
  },
  'glm-4-long': {
    name: 'GLM-4 Long',
    description: '長文本模型，支援大量輸入',
    category: '長文本',
    maxTokens: 1000000,
    contextWindow: 1000000
  },
  'glm-4v': {
    name: 'GLM-4V',
    description: '視覺模型，支援圖像理解',
    category: '視覺',
    maxTokens: 8192,
    contextWindow: 8192
  },
  'glm-4-alltools': {
    name: 'GLM-4 AllTools',
    description: '工具模型，支援多種工具調用',
    category: '工具',
    maxTokens: 128000,
    contextWindow: 128000
  },
  // GLM-3 系列
  'glm-3-turbo': {
    name: 'GLM-3 Turbo',
    description: '超快速模型，適合即時翻譯',
    category: '快速',
    maxTokens: 8192,
    contextWindow: 8192
  },
  'glm-3-turbo-0129': {
    name: 'GLM-3 Turbo (0129)',
    description: 'GLM-3 Turbo 特定版本',
    category: '快速',
    maxTokens: 8192,
    contextWindow: 8192
  },
  // 特定版本
  'glm-4-0520': {
    name: 'GLM-4 (0520)',
    description: 'GLM-4 特定版本',
    category: '標準',
    maxTokens: 128000,
    contextWindow: 128000
  }
};

// 測試用例
const TEST_CASES = [
  {
    name: '中文翻譯成英文',
    sourceLang: 'zh-TW',
    targetLang: 'en-US',
    text: '你好，世界！'
  },
  {
    name: '英文翻譯成中文',
    sourceLang: 'en-US',
    targetLang: 'zh-TW',
    text: 'Hello, world!'
  },
  {
    name: '中文翻譯成日文',
    sourceLang: 'zh-TW',
    targetLang: 'ja-JP',
    text: '你好，世界！'
  },
  {
    name: '英文翻譯成法文',
    sourceLang: 'en-US',
    targetLang: 'fr-FR',
    text: 'Hello, how are you?'
  },
  {
    name: '長文本翻譯',
    sourceLang: 'zh-TW',
    targetLang: 'en-US',
    text: '人工智能技術正在快速發展，為各個領域帶來了巨大的變革。從自然語言處理到計算機視覺，從機器學習到深度學習，AI 技術正在改變我們的生活方式和工作方式。'
  }
];

// 語言映射
const LANGUAGE_MAP = {
  'zh-TW': '中文 (繁體)',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'fr-FR': 'Français',
  'es-ES': 'Español'
};

// 生成翻譯系統提示詞
function getTranslationSystemPrompt(sourceLang, targetLang) {
  const sourceLanguage = LANGUAGE_MAP[sourceLang] || sourceLang;
  const targetLanguage = LANGUAGE_MAP[targetLang] || targetLang;
  
  return `你是一個專業的翻譯助手。請將${sourceLanguage}準確翻譯成${targetLanguage}。
重要規則：
1. 必須將整段內容翻譯成目標語言：${targetLanguage}
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
- 翻譯成英文時：請確保輸出的是正確的英文，不要翻譯成其他語言`;
}

// 標準翻譯測試
async function testStandardTranslation(testCase) {
  console.log(`\n📝 測試: ${testCase.name}`);
  console.log(`   來源語言: ${LANGUAGE_MAP[testCase.sourceLang]}`);
  console.log(`   目標語言: ${LANGUAGE_MAP[testCase.targetLang]}`);
  console.log(`   原文: ${testCase.text}`);
  
  try {
    const response = await fetch(TEST_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: TEST_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: getTranslationSystemPrompt(testCase.sourceLang, testCase.targetLang)
          },
          {
            role: 'user',
            content: testCase.text
          }
        ],
        temperature: TEST_CONFIG.temperature,
        max_tokens: TEST_CONFIG.maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content || '';
    
    console.log(`   ✅ 翻譯成功`);
    console.log(`   譯文: ${translation}`);
    console.log(`   使用 Tokens: ${data.usage?.total_tokens || 'N/A'}`);
    
    return {
      success: true,
      translation,
      usage: data.usage
    };
  } catch (error) {
    console.error(`   ❌ 翻譯失敗: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// 流式翻譯測試
async function testStreamTranslation(testCase) {
  console.log(`\n🌊 流式翻譯測試: ${testCase.name}`);
  console.log(`   來源語言: ${LANGUAGE_MAP[testCase.sourceLang]}`);
  console.log(`   目標語言: ${LANGUAGE_MAP[testCase.targetLang]}`);
  console.log(`   原文: ${testCase.text}`);
  
  try {
    const response = await fetch(TEST_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: TEST_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: getTranslationSystemPrompt(testCase.sourceLang, testCase.targetLang)
          },
          {
            role: 'user',
            content: testCase.text
          }
        ],
        stream: true,
        temperature: TEST_CONFIG.temperature,
        max_tokens: TEST_CONFIG.maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullTranslation = '';
    let chunkCount = 0;

    console.log('   開始接收流式數據...');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullTranslation += content;
              chunkCount++;
              process.stdout.write(`\r   接收中... (${chunkCount} chunks)`);
            }
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
    }
    
    console.log(`\r   ✅ 流式翻譯成功`);
    console.log(`   譯文: ${fullTranslation}`);
    console.log(`   接收數據塊: ${chunkCount}`);
    
    return {
      success: true,
      translation: fullTranslation,
      chunkCount
    };
  } catch (error) {
    console.error(`\r   ❌ 流式翻譯失敗: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// API 金鑰驗證測試
function testApiKeyValidation() {
  console.log('\n🔑 API 金鑰驗證測試');
  
  const testCases = [
    { apiKey: '', expected: false, description: '空金鑰' },
    { apiKey: 'invalid', expected: false, description: '無效格式' },
    { apiKey: 'abc.def', expected: true, description: '有效格式' },
    { apiKey: '12345678.abcdef1234567890', expected: true, description: '完整金鑰' }
  ];
  
  testCases.forEach(({ apiKey, expected, description }) => {
    const isValid = validateBigModelApiKey(apiKey);
    const status = isValid === expected ? '✅' : '❌';
    console.log(`   ${status} ${description}: ${isValid}`);
  });
}

// 驗證 BigModel API 金鑰格式
function validateBigModelApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  const parts = apiKey.split('.');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

// 運行所有測試
async function runAllTests() {
  console.log('========================================');
  console.log('BigModel API 集成測試');
  console.log('========================================');
  
  // 檢查 API 金鑰
  if (!TEST_CONFIG.apiKey) {
    console.error('\n❌ 錯誤: 請先在 TEST_CONFIG 中設置有效的 BigModel API 金鑰');
    console.log('   訪問 https://open.bigmodel.cn/ 獲取 API 金鑰');
    return;
  }
  
  // 驗證 API 金鑰格式
  console.log('\n🔍 驗證 API 金鑰格式...');
  const isValidKey = validateBigModelApiKey(TEST_CONFIG.apiKey);
  if (!isValidKey) {
    console.error('   ❌ API 金鑰格式無效');
    console.log('   正確格式: {id}.{secret}');
    return;
  }
  console.log('   ✅ API 金鑰格式正確');
  
  // 運行標準翻譯測試
  console.log('\n\n📚 標準翻譯測試');
  console.log('========================================');
  const standardResults = [];
  for (const testCase of TEST_CASES) {
    const result = await testStandardTranslation(testCase);
    standardResults.push(result);
  }
  
  // 運行流式翻譯測試（僅測試第一個用例）
  console.log('\n\n🌊 流式翻譯測試');
  console.log('========================================');
  const streamResult = await testStreamTranslation(TEST_CASES[0]);
  
  // 運行 API 金鑰驗證測試
  testApiKeyValidation();
  
  // 總結測試結果
  console.log('\n\n📊 測試結果總結');
  console.log('========================================');
  const passedTests = standardResults.filter(r => r.success).length;
  const totalTests = standardResults.length;
  console.log(`標準翻譯: ${passedTests}/${totalTests} 通過`);
  console.log(`流式翻譯: ${streamResult.success ? '✅ 通過' : '❌ 失敗'}`);
  
  if (passedTests === totalTests && streamResult.success) {
    console.log('\n🎉 所有測試通過！');
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查錯誤信息');
  }
}

// 導出測試函數（用於 Node.js）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testStandardTranslation,
    testStreamTranslation,
    testApiKeyValidation,
    validateBigModelApiKey,
    runAllTests,
    TEST_CONFIG
  };
}

// 在瀏覽器中運行
if (typeof window !== 'undefined') {
  window.BigModelTest = {
    testStandardTranslation,
    testStreamTranslation,
    testApiKeyValidation,
    validateBigModelApiKey,
    runAllTests,
    TEST_CONFIG
  };
  
  console.log('BigModel API 測試工具已載入');
  console.log('使用方法:');
  console.log('1. 設置 BigModelTest.TEST_CONFIG.apiKey = "your-api-key"');
  console.log('2. 運行 BigModelTest.runAllTests()');
  console.log('3. 或單獨運行 BigModelTest.testStandardTranslation(testCase)');
}
