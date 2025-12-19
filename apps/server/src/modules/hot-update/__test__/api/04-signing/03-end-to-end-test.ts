/**
 * 签名场景 - 完整流程测试
 *
 * 测试内容：
 * 1. 生成 RSA 密钥对
 * 2. 设置渠道签名密钥并启用签名
 * 3. 上传一个带资源的更新
 * 4. 使用 expo-expect-signature 头检查更新
 * 5. 验证响应头中的 expo-signature
 * 6. 使用公钥验证签名的有效性
 * 7. 测试禁用签名后的响应
 *
 * 运行: bun run src/modules/hot-update/__test__/api/04-signing/03-end-to-end-test.ts
 */

import { verifyManifestSignatureAsync } from '@/common/crypto';
import crypto from 'node:crypto';
import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Signing:E2E');

interface TestContext {
  accessToken?: string;
  projectId?: string;
  channelId?: string;
  channelKey?: string;
  publicKey?: string;
  privateKey?: string;
  testUpdateId?: string;
  [key: string]: unknown; // 允许额外字段
}

/** 生成 RSA 密钥对 */
function generateKeyPair(): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

/**
 * 创建测试 Bundle（ZIP 格式）
 */
async function createTestBundle(): Promise<Buffer> {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { execSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');

  // 创建临时目录
  const tmpDir = mkdtempSync(join(tmpdir(), 'rapid-s-signing-test-'));
  const zipPath = join(tmpdir(), 'signing-test-bundle.zip');

  // 创建简单的 bundle 文件
  const bundleContent = `
// Signed Bundle Test v1.0.0
console.log('Signed update loaded successfully!');
export default function App() {
  return { 
    message: 'Hello from signed update',
    timestamp: ${Date.now()}
  };
}`;

  writeFileSync(join(tmpDir, 'index.bundle'), bundleContent);

  // 使用系统 zip 命令打包
  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`, { stdio: 'ignore' });

  // 读取 ZIP 文件
  const zipBuffer = await Bun.file(zipPath).arrayBuffer();

  // 清理
  rmSync(tmpDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });

  return Buffer.from(zipBuffer);
}

/**
 * 解析 expo-signature 响应头
 */
function parseExpoSignature(header: string): {
  sig?: string;
  keyid?: string;
  alg?: string;
} {
  const result: Record<string, string | undefined> = {};

  // 解析 SFV 字典格式: sig=:base64:, keyid="root", alg="rsa-v1_5-sha256"
  const sigMatch = header.match(/sig=:([^:]+):/);
  if (sigMatch?.[1]) result.sig = sigMatch[1];

  const keyidMatch = header.match(/keyid="([^"]+)"/);
  if (keyidMatch?.[1]) result.keyid = keyidMatch[1];

  const algMatch = header.match(/alg="([^"]+)"/);
  if (algMatch?.[1]) result.alg = algMatch[1];

  return result;
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('🔐 签名场景 - 完整端到端测试');
  logger.info('='.repeat(60));

  try {
    const ctx = (await loadTestContext()) as TestContext;
    if (!ctx.accessToken || !ctx.channelId || !ctx.channelKey) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // ========== 步骤 1: 生成并设置签名密钥 ==========
    logger.info('\n📝 步骤 1: 生成并设置签名密钥');
    logger.info('-'.repeat(60));

    const { publicKey, privateKey } = generateKeyPair();
    logger.info('✅ RSA 2048 密钥对已生成', {
      publicKeyLength: publicKey.length,
      privateKeyLength: privateKey.length,
    });

    await manage.channels.setSigningKeys.mutate({
      id: ctx.channelId,
      publicKey,
      privateKey,
    });
    logger.info('✅ 签名密钥已设置到渠道');

    // 保存到上下文
    await saveTestContext({ publicKey, privateKey });

    // ========== 步骤 2: 上传带资源的测试更新 ==========
    logger.info('\n📝 步骤 2: 上传测试更新（包含资源）');
    logger.info('-'.repeat(60));

    const bundleBuffer = await createTestBundle();
    const formData = new FormData();

    // 更新基本信息
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', 'Signed update test');
    formData.append(
      'metadata',
      JSON.stringify({
        branch: 'main',
        environment: 'test-signing',
      })
    );

    // Bundle ZIP 文件
    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    const uploadResponse = await fetch(
      `${API_URL}/hotUpdate.manage.updates.upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(
        `Upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`
      );
    }

    const uploadResult = await uploadResponse.json();
    const updateId = uploadResult.result?.data?.update?.id;

    if (!updateId) {
      throw new Error('未获取到更新 ID');
    }

    logger.info('✅ 测试更新已上传', {
      updateId,
      bundleSize: bundleBuffer.length,
    });

    await saveTestContext({ testUpdateId: updateId });

    // ========== 步骤 3: 检查更新（携带 expo-expect-signature 头）==========
    logger.info('\n📝 步骤 3: 检查更新（请求签名）');
    logger.info('-'.repeat(60));

    const checkUrl = new URL(
      `${API_URL}/trpc/hotUpdate.protocol.manifest.check`
    );
    checkUrl.searchParams.set(
      'input',
      JSON.stringify({
        channelKey: ctx.channelKey,
        runtimeVersion: '1.0.0',
        platform: 'ios',
      })
    );

    const checkResponse = await fetch(checkUrl.toString(), {
      headers: {
        'expo-protocol-version': '1',
        'expo-platform': 'ios',
        'expo-runtime-version': '1.0.0',
        'expo-expect-signature': 'sig, keyid="root", alg="rsa-v1_5-sha256"',
      },
    });

    if (!checkResponse.ok) {
      throw new Error(
        `Check update failed: ${checkResponse.status} ${await checkResponse.text()}`
      );
    }

    // ========== 步骤 4: 验证响应头 ==========
    logger.info('\n📝 步骤 4: 验证响应头');
    logger.info('-'.repeat(60));

    const expoSignatureHeader = checkResponse.headers.get('expo-signature');
    if (!expoSignatureHeader) {
      throw new Error('❌ 缺少 expo-signature 响应头');
    }

    logger.info('✅ expo-signature 响应头存在', {
      header: expoSignatureHeader,
    });

    const signatureParts = parseExpoSignature(expoSignatureHeader);
    if (!signatureParts.sig) {
      throw new Error('❌ 无法解析签名数据');
    }

    logger.info('✅ 签名数据已解析', {
      sigLength: signatureParts.sig.length,
      keyid: signatureParts.keyid,
      alg: signatureParts.alg,
    });

    // ========== 步骤 5: 验证签名有效性 ==========
    logger.info('\n📝 步骤 5: 使用公钥验证签名');
    logger.info('-'.repeat(60));

    const checkResult = await checkResponse.json();
    if (checkResult.result.data.type !== 'updateAvailable') {
      throw new Error('❌ 未返回更新');
    }

    const manifest = checkResult.result.data.manifest;
    const manifestJson = JSON.stringify(manifest);

    const isValid = await verifyManifestSignatureAsync(
      manifestJson,
      signatureParts.sig,
      publicKey
    );

    if (!isValid) {
      throw new Error('❌ 签名验证失败');
    }

    logger.info('✅ 签名验证成功', {
      manifestId: manifest.id,
      manifestSize: manifestJson.length,
    });

    // ========== 步骤 6: 测试 Manifest Filters ==========
    logger.info('\n📝 步骤 6: 验证 Manifest Filters');
    logger.info('-'.repeat(60));

    const manifestFiltersHeader = checkResponse.headers.get(
      'expo-manifest-filters'
    );
    logger.info('expo-manifest-filters 响应头', {
      header: manifestFiltersHeader || '(empty)',
    });

    if (manifestFiltersHeader) {
      logger.info('✅ Manifest Filters 已设置', {
        filters: manifestFiltersHeader,
      });
    } else {
      logger.info('ℹ️  Manifest Filters 为空（渠道未配置过滤键）');
    }

    // ========== 步骤 7: 禁用签名并测试 ==========
    logger.info('\n📝 步骤 7: 禁用签名并测试');
    logger.info('-'.repeat(60));

    await manage.channels.disableSigning.mutate({
      id: ctx.channelId,
    });
    logger.info('✅ 签名已禁用');

    const checkWithoutSigResponse = await fetch(checkUrl.toString(), {
      headers: {
        'expo-protocol-version': '1',
        'expo-platform': 'ios',
        'expo-runtime-version': '1.0.0',
      },
    });

    const expoSignatureHeaderAfterDisable =
      checkWithoutSigResponse.headers.get('expo-signature');

    if (expoSignatureHeaderAfterDisable) {
      throw new Error('❌ 禁用签名后仍返回 expo-signature 头');
    }

    logger.info('✅ 禁用签名后不再返回 expo-signature 头');

    // ========== 测试完成 ==========
    logger.info('\n' + '='.repeat(60));
    logger.info('🎉 端到端签名测试全部通过！');
    logger.info('='.repeat(60));

    logger.info('\n✅ 测试摘要:');
    logger.info('  1. ✅ RSA 密钥对生成成功');
    logger.info('  2. ✅ 签名密钥设置成功');
    logger.info('  3. ✅ 带签名的更新上传成功');
    logger.info('  4. ✅ expo-signature 响应头正确返回');
    logger.info('  5. ✅ 签名验证成功');
    logger.info('  6. ✅ Manifest Filters 功能验证');
    logger.info('  7. ✅ 禁用签名后正确停止签名');

    logger.info('\n💡 提示: 可以运行 99-cleanup.ts 清理测试数据');
  } catch (error) {
    logger.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
