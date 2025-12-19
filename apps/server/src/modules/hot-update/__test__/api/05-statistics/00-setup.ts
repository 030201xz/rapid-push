/**
 * 统计场景 - 步骤 00: 环境准备（含上传更新）
 *
 * 统计测试需要有更新记录才能进行统计查询
 *
 * 运行: bun run src/modules/hot-update/__test__/api/05-statistics/00-setup.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  clearTestContext,
  createAnonymousClient,
  createTestLogger,
  DEMO_CONFIG,
  getManageApi,
  loginAsAdmin,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Statistics:00-Setup');

async function getOrganization(
  client: ReturnType<typeof createAnonymousClient>
) {
  const manage = getManageApi(client);
  const org = await manage.organizations.bySlug.query({
    slug: DEMO_CONFIG.organizationSlug,
  });
  if (!org) throw new Error('组织不存在');
  return org;
}

async function getProject(
  client: ReturnType<typeof createAnonymousClient>,
  organizationId: string
) {
  const manage = getManageApi(client);
  const project = await manage.projects.bySlug.query({
    organizationId,
    slug: DEMO_CONFIG.projectSlug,
  });
  if (!project) throw new Error('项目不存在');
  return project;
}

async function getProductionChannel(
  client: ReturnType<typeof createAnonymousClient>,
  projectId: string
) {
  const manage = getManageApi(client);
  const channels = await manage.channels.listByProject.query({
    projectId,
  });
  const channel = channels?.find(c => c.name === 'production');
  if (!channel) throw new Error('渠道不存在');
  return channel;
}

async function createBundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-stats-bundle';
  const zipPath = '/tmp/rapid-s-stats-bundle.zip';

  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  mkdirSync(join(tmpDir, 'ios'), { recursive: true });
  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  writeFileSync(
    join(tmpDir, 'ios', 'index.bundle'),
    `// iOS Stats Test\nexport default { ts: ${Date.now()} };`
  );
  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    `// Android Stats Test\nexport default { ts: ${Date.now()} };`
  );

  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`);
  const buffer = await Bun.file(zipPath).arrayBuffer();
  rmSync(tmpDir, { recursive: true, force: true });

  return Buffer.from(buffer);
}

async function main() {
  logger.info('='.repeat(50));
  logger.info('📊 统计场景 - 步骤 00: 环境准备');
  logger.info('='.repeat(50));

  try {
    await clearTestContext();

    // 1. 登录并获取基础信息
    const { accessToken, client } = await loginAsAdmin(logger);
    const org = await getOrganization(client);
    const project = await getProject(client, org.id);
    const channel = await getProductionChannel(client, project.id);

    logger.info('✅ 环境信息', {
      org: org.name,
      project: project.name,
      channel: channel.name,
    });

    // 2. 上传一个更新（用于统计测试）
    logger.info('上传测试更新...');
    const bundleBuffer = await createBundleZip();

    const formData = new FormData();
    formData.append('channelId', channel.id);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', '统计测试更新');
    formData.append('rolloutPercentage', '100');

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    const response = await fetch(
      `${API_URL}/hotUpdate.manage.updates.upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    const result = await response.json();
    const updateId = result.result?.data?.update?.id;
    if (!updateId) {
      throw new Error('未获取到更新 ID');
    }

    logger.info('✅ 更新上传成功', { updateId });

    // 3. 保存上下文
    await saveTestContext({
      accessToken,
      organizationId: org.id,
      projectId: project.id,
      channelId: channel.id,
      channelKey: channel.channelKey,
      updateIds: [updateId],
      ruleIds: [],
    });

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 00 完成！');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run .../05-statistics/01-query-stats.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
