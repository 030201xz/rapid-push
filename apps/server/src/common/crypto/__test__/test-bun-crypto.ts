/**
 * RSA 签名测试 - Bun Web Crypto 实现
 *
 * 测试内容：
 * 1. 密钥对生成（异步）
 * 2. 数据签名与验证
 * 3. Expo Manifest 签名格式
 * 4. 与 Node.js 实现的互操作性
 *
 * 运行: bun run src/common/crypto/__test__/test-bun-crypto.ts
 */

import { createLogger } from '@rapid-s/logger';
import {
  generateKeyPair as generateKeyPairNode,
  signData as signDataNode,
  verifySignature as verifySignatureNode,
} from '../signature';
import {
  generateKeyPairAsync,
  signDataAsync,
  signManifestAsync,
  verifyManifestSignatureAsync,
  verifySignatureAsync,
} from '../signature-bun';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:BunCrypto',
});

// ========== 测试用 Manifest ==========
const TEST_MANIFEST = {
  id: 'test-update-id-12345',
  createdAt: '2025-12-19T12:00:00.000Z',
  runtimeVersion: '1.0.0',
  launchAsset: {
    hash: 'abc123def456',
    key: 'bundles/ios-abc123.js',
    contentType: 'application/javascript',
    fileExtension: '.js',
    url: '/assets/abc123def456',
  },
  assets: [],
  metadata: { channel: 'production' },
  extra: {},
};

// ========== 测试函数 ==========

/** 测试密钥对生成 */
async function testKeyPairGeneration(): Promise<boolean> {
  logger.info('测试密钥对生成...');

  const keyPair = await generateKeyPairAsync();

  // 验证公钥格式
  if (!keyPair.publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
    logger.error('公钥格式错误');
    return false;
  }

  // 验证私钥格式
  if (!keyPair.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    logger.error('私钥格式错误');
    return false;
  }

  logger.info('密钥对生成成功', {
    publicKeyLength: keyPair.publicKey.length,
    privateKeyLength: keyPair.privateKey.length,
  });

  return true;
}

/** 测试数据签名与验证 */
async function testDataSignature(): Promise<boolean> {
  logger.info('测试数据签名与验证...');

  const keyPair = await generateKeyPairAsync();
  const testData = 'Hello, Expo Updates from Bun!';

  // 签名
  const signature = await signDataAsync(testData, keyPair.privateKey);
  logger.info('数据签名完成', {
    dataLength: testData.length,
    signatureLength: signature.length,
    signaturePreview: `${signature.substring(0, 20)}...`,
  });

  // 验证正确数据
  const isValid = await verifySignatureAsync(
    testData,
    signature,
    keyPair.publicKey
  );
  if (!isValid) {
    logger.error('签名验证失败：正确数据应通过验证');
    return false;
  }
  logger.info('正确数据验证通过');

  // 验证篡改数据
  const isTamperedValid = await verifySignatureAsync(
    'Tampered data!',
    signature,
    keyPair.publicKey
  );
  if (isTamperedValid) {
    logger.error('签名验证失败：篡改数据不应通过验证');
    return false;
  }
  logger.info('篡改数据验证被拒绝（预期行为）');

  return true;
}

/** 测试 Expo Manifest 签名 */
async function testManifestSignature(): Promise<boolean> {
  logger.info('测试 Expo Manifest 签名...');

  const keyPair = await generateKeyPairAsync();
  const manifestJson = JSON.stringify(TEST_MANIFEST);

  // 签名
  const expoSignature = await signManifestAsync(
    manifestJson,
    keyPair.privateKey
  );
  logger.info('Manifest 签名完成', {
    signatureFormat: expoSignature.substring(0, 20) + '...',
  });

  // 验证 SFV 格式
  if (
    !expoSignature.startsWith('sig=:') ||
    !expoSignature.endsWith(':')
  ) {
    logger.error('签名格式错误：应为 SFV 格式 sig=:...:');
    return false;
  }
  logger.info('SFV 格式验证通过');

  // 验证签名
  const isValid = await verifyManifestSignatureAsync(
    manifestJson,
    expoSignature,
    keyPair.publicKey
  );
  if (!isValid) {
    logger.error('Manifest 签名验证失败');
    return false;
  }
  logger.info('Manifest 签名验证通过');

  // 验证篡改 Manifest
  const tamperedManifest = JSON.stringify({
    ...TEST_MANIFEST,
    id: 'tampered-id',
  });
  const isTamperedValid = await verifyManifestSignatureAsync(
    tamperedManifest,
    expoSignature,
    keyPair.publicKey
  );
  if (isTamperedValid) {
    logger.error('签名验证失败：篡改 Manifest 不应通过验证');
    return false;
  }
  logger.info('篡改 Manifest 验证被拒绝（预期行为）');

  return true;
}

/** 测试互操作性：Node.js 签名 + Bun 验证 */
async function testNodeSignBunVerify(): Promise<boolean> {
  logger.info('测试互操作性：Node.js 签名 -> Bun 验证...');

  // 使用 Node.js 生成密钥和签名
  const keyPair = generateKeyPairNode();
  const testData = 'Cross-platform signature test';
  const nodeSignature = signDataNode(testData, keyPair.privateKey);

  logger.info('Node.js 签名完成', {
    signatureLength: nodeSignature.length,
  });

  // 使用 Bun 验证
  const isValid = await verifySignatureAsync(
    testData,
    nodeSignature,
    keyPair.publicKey
  );
  if (!isValid) {
    logger.error('互操作性验证失败：Bun 无法验证 Node.js 签名');
    return false;
  }

  logger.info('互操作性验证通过：Bun 成功验证 Node.js 签名');
  return true;
}

/** 测试互操作性：Bun 签名 + Node.js 验证 */
async function testBunSignNodeVerify(): Promise<boolean> {
  logger.info('测试互操作性：Bun 签名 -> Node.js 验证...');

  // 使用 Bun 生成密钥和签名
  const keyPair = await generateKeyPairAsync();
  const testData = 'Cross-platform signature test';
  const bunSignature = await signDataAsync(
    testData,
    keyPair.privateKey
  );

  logger.info('Bun 签名完成', {
    signatureLength: bunSignature.length,
  });

  // 使用 Node.js 验证
  const isValid = verifySignatureNode(
    testData,
    bunSignature,
    keyPair.publicKey
  );
  if (!isValid) {
    logger.error('互操作性验证失败：Node.js 无法验证 Bun 签名');
    return false;
  }

  logger.info('互操作性验证通过：Node.js 成功验证 Bun 签名');
  return true;
}

/** 测试无效签名格式 */
async function testInvalidSignatureFormat(): Promise<boolean> {
  logger.info('测试无效签名格式处理...');

  const keyPair = await generateKeyPairAsync();
  const manifestJson = JSON.stringify(TEST_MANIFEST);

  // 测试无效格式
  const invalidFormats = [
    'invalid-signature',
    'sig=invalid',
    'sig=:',
    ':base64:',
    '',
  ];

  for (const invalidSig of invalidFormats) {
    const isValid = await verifyManifestSignatureAsync(
      manifestJson,
      invalidSig,
      keyPair.publicKey
    );
    if (isValid) {
      logger.error(`无效签名格式被接受: ${invalidSig}`);
      return false;
    }
  }

  logger.info('所有无效签名格式被正确拒绝');
  return true;
}

// ========== 主函数 ==========

async function main() {
  logger.info('========== Bun Web Crypto 签名测试 ==========');

  const tests = [
    { name: '密钥对生成', fn: testKeyPairGeneration },
    { name: '数据签名验证', fn: testDataSignature },
    { name: 'Manifest 签名', fn: testManifestSignature },
    { name: 'Node.js签名->Bun验证', fn: testNodeSignBunVerify },
    { name: 'Bun签名->Node.js验证', fn: testBunSignNodeVerify },
    { name: '无效签名格式', fn: testInvalidSignatureFormat },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        logger.info(`✅ ${test.name} 通过`);
        passed++;
      } else {
        logger.error(`❌ ${test.name} 失败`);
        failed++;
      }
    } catch (error) {
      logger.error(`❌ ${test.name} 异常`, { error });
      failed++;
    }
  }

  logger.info('========================================');
  logger.info(`测试结果: ${passed} 通过, ${failed} 失败`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  logger.error('测试执行失败', { error });
  process.exitCode = 1;
});
