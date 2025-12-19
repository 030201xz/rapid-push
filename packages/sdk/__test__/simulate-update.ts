/**
 * 更新流程模拟测试
 * 
 * 这个文件用于在 Node.js 环境下模拟 expo-updates 的请求流程
 * 以诊断为什么 checkForUpdateAsync 一直不返回
 * 
 * 运行方式: bun __test__/simulate-update.ts
 */

// ==================== 配置 ====================

const SERVER_URL = 'http://192.168.8.114:6688';
const CHANNEL_KEY = 'prod_demo_app_channel_key_12345678';
const RUNTIME_VERSION = '1.0.0';
const PLATFORM = 'android';

// 模拟 expo-updates 请求的 URL
const MANIFEST_URL = `${SERVER_URL}/manifests/${CHANNEL_KEY}`;

// ==================== 请求头模拟 ====================

// expo-updates 发送的请求头（参考 Expo Updates Protocol）
const headers: Record<string, string> = {
  'Accept': 'application/expo+json,application/json',
  'expo-platform': PLATFORM,
  'expo-runtime-version': RUNTIME_VERSION,
  'expo-protocol-version': '1',
  // 可选：当前更新 ID（如果有）
  // 'expo-current-update-id': 'current-update-uuid',
  // 可选：嵌入更新 ID
  // 'expo-embedded-update-id': 'embedded-update-uuid',
};

// ==================== 测试函数 ====================

async function testManifestRequest() {
  console.log('========================================');
  console.log('模拟 expo-updates manifest 请求');
  console.log('========================================');
  console.log('');
  console.log('请求 URL:', MANIFEST_URL);
  console.log('请求头:', JSON.stringify(headers, null, 2));
  console.log('');

  const startTime = Date.now();
  
  try {
    console.log('正在发送请求...');
    
    const response = await fetch(MANIFEST_URL, {
      method: 'GET',
      headers,
    });

    const elapsed = Date.now() - startTime;
    console.log(`响应耗时: ${elapsed}ms`);
    console.log('响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      const body = await response.text();
      console.log('响应体长度:', body.length);
      console.log('响应体内容:');
      console.log(body.slice(0, 2000));
      
      if (body.length > 2000) {
        console.log('... (截断)');
      }
    } else if (response.status === 204) {
      console.log('✅ 无可用更新 (204 No Content)');
    } else {
      console.log('❌ 非预期状态码');
      const body = await response.text();
      console.log('错误响应:', body);
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`请求失败 (耗时: ${elapsed}ms)`);
    console.log('错误:', error);
  }
}

async function testServerHealth() {
  console.log('');
  console.log('========================================');
  console.log('测试服务器健康状态');
  console.log('========================================');
  console.log('');

  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      method: 'GET',
    });
    console.log('健康检查状态:', response.status);
    const body = await response.text();
    console.log('响应:', body);
  } catch (error) {
    console.log('健康检查失败:', error);
  }
}

async function testRootEndpoint() {
  console.log('');
  console.log('========================================');
  console.log('测试根端点');
  console.log('========================================');
  console.log('');

  try {
    const response = await fetch(SERVER_URL, {
      method: 'GET',
    });
    console.log('根端点状态:', response.status);
    const body = await response.text();
    console.log('响应:', body.slice(0, 500));
  } catch (error) {
    console.log('根端点失败:', error);
  }
}

// ==================== 运行测试 ====================

async function main() {
  console.log('');
  console.log('🔍 RapidS SDK 更新流程诊断工具');
  console.log('');
  
  // 测试服务器是否可达
  await testRootEndpoint();
  await testServerHealth();
  
  // 测试 manifest 请求
  await testManifestRequest();
  
  console.log('');
  console.log('========================================');
  console.log('诊断完成');
  console.log('========================================');
}

main().catch(console.error);
