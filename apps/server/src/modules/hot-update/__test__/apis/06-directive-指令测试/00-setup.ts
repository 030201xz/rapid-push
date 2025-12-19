/**
 * 指令测试 - 步骤 00: 初始化测试环境
 *
 * 测试内容：
 * - 登录管理员账户
 * - 创建测试组织
 * - 创建测试项目
 * - 创建测试渠道
 * - 上传初始更新（用于验证指令优先级）
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/00-setup.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  createTestLogger,
  getManageApi,
  loginAsAdmin,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Directive:00-Setup');

async function main() {
  logger.info('='.repeat(60));
  logger.info('📜 指令测试 - 步骤 00: 初始化测试环境');
  logger.info('='.repeat(60));

  try {
    // 1. 管理员登录
    logger.info('\n📝 步骤 1: 管理员登录');
    logger.info('-'.repeat(60));

    const { accessToken, client } = await loginAsAdmin(logger);

    // 2. 创建测试组织
    logger.info('\n📝 步骤 2: 创建测试组织');
    logger.info('-'.repeat(60));

    const manage = getManageApi(client);

    let organizationId: string;
    try {
      const org = await manage.organizations.create.mutate({
        name: 'Directive Test Org',
        slug: 'directive-test',
        description: '指令测试组织',
      });
      organizationId = org.id;
      logger.info('✅ 测试组织已创建', { id: organizationId });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('已存在')
      ) {
        const org = await manage.organizations.bySlug.query({
          slug: 'directive-test',
        });
        if (!org) throw new Error('组织不存在');
        organizationId = org.id;
        logger.info('ℹ️  使用现有组织', { id: organizationId });
      } else {
        throw error;
      }
    }

    // 3. 创建测试项目
    logger.info('\n📝 步骤 3: 创建测试项目');
    logger.info('-'.repeat(60));

    let projectId: string;
    try {
      const project = await manage.projects.create.mutate({
        organizationId,
        name: 'Directive Test App',
        slug: 'directive-app',
        description: '指令测试应用',
      });
      projectId = project.id;
      logger.info('✅ 测试项目已创建', { id: projectId });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('已存在')
      ) {
        const project = await manage.projects.bySlug.query({
          organizationId,
          slug: 'directive-app',
        });
        if (!project) throw new Error('项目不存在');
        projectId = project.id;
        logger.info('ℹ️  使用现有项目', { id: projectId });
      } else {
        throw error;
      }
    }

    // 4. 创建测试渠道
    logger.info('\n📝 步骤 4: 创建测试渠道');
    logger.info('-'.repeat(60));

    let channelId: string;
    let channelKey: string;
    try {
      const existingChannels =
        await manage.channels.listByProject.query({
          projectId,
        });
      const existingChannel = existingChannels.find(
        c => c.name === 'directive-production'
      );

      if (existingChannel) {
        channelId = existingChannel.id;
        channelKey = existingChannel.channelKey;
        logger.info('ℹ️  使用现有渠道', {
          id: channelId,
          key: channelKey,
        });
      } else {
        const channel = await manage.channels.create.mutate({
          projectId,
          name: 'directive-production',
          description: '指令测试渠道',
        });
        channelId = channel.id;
        channelKey = channel.channelKey;
        logger.info('✅ 测试渠道已创建', {
          id: channelId,
          key: channelKey,
        });
      }
    } catch (error) {
      throw error;
    }

    // 5. 上传初始更新（用于验证指令优先级）
    logger.info('\n📝 步骤 5: 上传初始更新');
    logger.info('-'.repeat(60));

    // 创建临时目录和 bundle 文件
    const tmpDir = '/tmp/rapid-s-directive-bundle';
    const zipPath = '/tmp/rapid-s-directive-bundle.zip';

    try {
      rmSync(tmpDir, { recursive: true, force: true });
      rmSync(zipPath, { force: true });
    } catch {
      // 忽略清理错误
    }

    mkdirSync(join(tmpDir, 'android'), { recursive: true });

    const bundleContent = `
// Directive Test Bundle v1.0.0
console.log("Directive Test Bundle - Initial Version");
export default { version: "1.0.0", name: "directive-test" };
`.trim();

    writeFileSync(
      join(tmpDir, 'android', 'index.bundle'),
      bundleContent
    );

    // 创建 zip 包
    execSync(`cd ${tmpDir} && zip -r ${zipPath} .`, {
      stdio: 'ignore',
    });

    const bundleFile = Bun.file(zipPath);
    const bundleBuffer = Buffer.from(await bundleFile.arrayBuffer());

    // 使用 HTTP API 上传
    const formData = new FormData();
    formData.append('channelId', channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', '指令测试初始版本');
    formData.append('rolloutPercentage', '100');
    formData.append(
      'metadata',
      JSON.stringify({ version: '1.0.0', type: 'initial' })
    );

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    const uploadUrl = `${API_URL}/hotUpdate.manage.updates.upload`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `上传失败: ${uploadResponse.status} - ${errorText}`
      );
    }

    const uploadResult = await uploadResponse.json();
    const update = uploadResult.result?.data?.update;
    if (!update) {
      throw new Error('上传失败：未返回更新信息');
    }

    logger.info('✅ 初始更新已创建', { id: update.id });

    // 清理临时文件
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });

    // 6. 保存测试上下文
    await saveTestContext({
      accessToken,
      organizationId,
      projectId,
      channelId,
      channelKey,
      updateIds: [update.id],
    });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 环境初始化完成！');
    logger.info('='.repeat(60));
    logger.info('\n✅ 测试上下文已保存:');
    logger.info(`  - Organization ID: ${organizationId}`);
    logger.info(`  - Project ID: ${projectId}`);
    logger.info(`  - Channel ID: ${channelId}`);
    logger.info(`  - Channel Key: ${channelKey}`);
    logger.info(`  - Initial Update ID: ${update.id}`);

    logger.info('\n💡 提示: 现在可以测试指令创建');
  } catch (error) {
    logger.error('❌ 初始化失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
