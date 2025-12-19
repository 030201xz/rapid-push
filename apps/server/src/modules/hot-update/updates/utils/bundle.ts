/**
 * Bundle 解压工具
 *
 * 处理 Expo Bundle ZIP 文件的解压和资源提取
 */

import { sha256Base64Url } from '@/common/storage';
import mime from 'mime-types';
import unzipper from 'unzipper';
import {
  detectIsLaunchAsset,
  detectPlatform,
  getFileExtension,
  type Platform,
} from './platform';

/**
 * 提取的资源信息
 */
export interface ExtractedAsset {
  /** 文件在 ZIP 中的原始路径 */
  key: string;
  /** 文件名 */
  fileName: string;
  /** 文件内容 */
  content: Buffer;
  /** 内容哈希（SHA-256 Base64 URL） */
  hash: string;
  /** MIME 类型 */
  contentType: string;
  /** 文件扩展名 */
  fileExtension: string | null;
  /** 文件大小 */
  size: number;
  /** 所属平台 */
  platform: Platform;
  /** 是否为 Launch Asset */
  isLaunchAsset: boolean;
}

/**
 * Bundle 解压结果
 */
export interface ExtractBundleResult {
  /** 提取的资源列表 */
  assets: ExtractedAsset[];
  /** iOS Launch Asset */
  iosLaunchAsset: ExtractedAsset | null;
  /** Android Launch Asset */
  androidLaunchAsset: ExtractedAsset | null;
  /** 通用 Launch Asset（无平台标识） */
  genericLaunchAsset: ExtractedAsset | null;
}

/**
 * 解压 Bundle ZIP 并提取资源信息
 *
 * @param bundleBuffer - ZIP 文件 Buffer
 * @returns 解压结果
 * @throws 如果没有有效的 Launch Asset
 */
export async function extractBundle(
  bundleBuffer: Buffer
): Promise<ExtractBundleResult> {
  const directory = await unzipper.Open.buffer(bundleBuffer);
  const assets: ExtractedAsset[] = [];

  for (const file of directory.files) {
    // 跳过目录
    if (file.type === 'Directory') continue;

    // 读取文件内容
    const content = await file.buffer();
    const fileName = file.path.split('/').pop() ?? '';

    // 计算哈希
    const hash = sha256Base64Url(content);

    // 检测 MIME 类型
    const contentType =
      mime.lookup(fileName) || 'application/octet-stream';

    // 检测平台和 Launch Asset
    const platform = detectPlatform(file.path);
    const isLaunchAsset = detectIsLaunchAsset(file.path, fileName);

    assets.push({
      key: file.path,
      fileName,
      content,
      hash,
      contentType,
      fileExtension: getFileExtension(fileName),
      size: content.length,
      platform,
      isLaunchAsset,
    });
  }

  // 分类 Launch Assets
  const iosLaunchAsset =
    assets.find(a => a.isLaunchAsset && a.platform === 'ios') ?? null;
  const androidLaunchAsset =
    assets.find(a => a.isLaunchAsset && a.platform === 'android') ??
    null;
  const genericLaunchAsset =
    assets.find(a => a.isLaunchAsset && a.platform === null) ?? null;

  // 验证至少有一个 Launch Asset
  if (!iosLaunchAsset && !androidLaunchAsset && !genericLaunchAsset) {
    // 尝试找一个 JS 文件作为 Launch Asset
    const jsAsset = assets.find(
      a =>
        a.contentType.includes('javascript') &&
        !a.key.includes('/web/')
    );

    if (jsAsset) {
      jsAsset.isLaunchAsset = true;
    } else {
      throw new Error(
        'Bundle 必须包含至少一个 Launch Asset（JavaScript Bundle）'
      );
    }
  }

  return {
    assets,
    iosLaunchAsset,
    androidLaunchAsset,
    genericLaunchAsset,
  };
}
