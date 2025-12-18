import { z } from "zod";
import { createClient } from "../src";

/**
 * Rick and Morty API 客户端示例
 * API 文档: https://rickandmortyapi.com/documentation
 */

// ===== Schema 定义 =====

// 分页信息 Schema
const InfoSchema = z.object({
  count: z.number(),
  pages: z.number(),
  next: z.url().nullable(),
  prev: z.url().nullable(),
});

// 位置引用 Schema
const LocationRefSchema = z.object({
  name: z.string(),
  url: z.string(), // API 可能返回空字符串
});

// 角色 Schema
const CharacterSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(["Alive", "Dead", "unknown"]),
  species: z.string(),
  type: z.string(),
  gender: z.enum(["Female", "Male", "Genderless", "unknown"]),
  origin: LocationRefSchema,
  location: LocationRefSchema,
  image: z.url(),
  episode: z.array(z.string()), // URL 字符串数组
  url: z.url(),
  created: z.iso.datetime(),
});

// 分页响应 Schema
const CharacterListSchema = z.object({
  info: InfoSchema,
  results: z.array(CharacterSchema),
});

// 位置 Schema
const LocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  dimension: z.string(),
  residents: z.array(z.string()), // URL 字符串数组
  url: z.url(),
  created: z.iso.datetime(),
});

const LocationListSchema = z.object({
  info: InfoSchema,
  results: z.array(LocationSchema),
});

// 剧集 Schema
const EpisodeSchema = z.object({
  id: z.number(),
  name: z.string(),
  air_date: z.string(),
  episode: z.string(), // e.g., "S01E01"
  characters: z.array(z.string()), // URL 字符串数组
  url: z.url(),
  created: z.iso.datetime(),
});

const EpisodeListSchema = z.object({
  info: InfoSchema,
  results: z.array(EpisodeSchema),
});

// API 根响应 Schema
const ApiRootSchema = z.object({
  characters: z.url(),
  locations: z.url(),
  episodes: z.url(),
});

// ===== 创建 API 客户端 =====

const rickAndMortyApi = createClient({
  baseURL: "https://rickandmortyapi.com/api",
  timeout: 10000,
  headers: {
    "User-Agent": "x-requests-example/1.0",
  },
});

// ===== API 方法封装 =====

/**
 * Rick and Morty API 客户端
 */
export const RickAndMortyAPI = {
  /**
   * 获取 API 根信息
   */
  async getRoot() {
    return rickAndMortyApi.get("/", {
      responseSchema: ApiRootSchema,
    });
  },

  /**
   * 获取所有角色 (分页)
   */
  async getCharacters(page?: number) {
    return rickAndMortyApi.get("/character", {
      query: { page },
      responseSchema: CharacterListSchema,
    });
  },

  /**
   * 根据 ID 获取单个角色
   */
  async getCharacterById(id: number) {
    return rickAndMortyApi.get("/character/:id", {
      params: { id },
      responseSchema: CharacterSchema,
    });
  },

  /**
   * 根据 ID 数组获取多个角色
   */
  async getCharactersByIds(ids: number[]) {
    return rickAndMortyApi.get("/character/:ids", {
      params: { ids: ids.join(",") },
      responseSchema: z.array(CharacterSchema),
    });
  },

  /**
   * 筛选角色
   */
  async filterCharacters(filters: {
    name?: string;
    status?: "alive" | "dead" | "unknown";
    species?: string;
    type?: string;
    gender?: "female" | "male" | "genderless" | "unknown";
    page?: number;
  }) {
    return rickAndMortyApi.get("/character", {
      query: filters,
      responseSchema: CharacterListSchema,
    });
  },

  /**
   * 获取所有位置 (分页)
   */
  async getLocations(page?: number) {
    return rickAndMortyApi.get("/location", {
      query: { page },
      responseSchema: LocationListSchema,
    });
  },

  /**
   * 根据 ID 获取单个位置
   */
  async getLocationById(id: number) {
    return rickAndMortyApi.get("/location/:id", {
      params: { id },
      responseSchema: LocationSchema,
    });
  },

  /**
   * 筛选位置
   */
  async filterLocations(filters: {
    name?: string;
    type?: string;
    dimension?: string;
    page?: number;
  }) {
    return rickAndMortyApi.get("/location", {
      query: filters,
      responseSchema: LocationListSchema,
    });
  },

  /**
   * 获取所有剧集 (分页)
   */
  async getEpisodes(page?: number) {
    return rickAndMortyApi.get("/episode", {
      query: { page },
      responseSchema: EpisodeListSchema,
    });
  },

  /**
   * 根据 ID 获取单个剧集
   */
  async getEpisodeById(id: number) {
    return rickAndMortyApi.get("/episode/:id", {
      params: { id },
      responseSchema: EpisodeSchema,
    });
  },

  /**
   * 筛选剧集
   */
  async filterEpisodes(filters: {
    name?: string;
    episode?: string; // e.g., "S01E01"
    page?: number;
  }) {
    return rickAndMortyApi.get("/episode", {
      query: filters,
      responseSchema: EpisodeListSchema,
    });
  },
};

// ===== 使用示例 =====

async function main() {
  console.log("🚀 Rick and Morty API 示例\n");

  try {
    // 示例 1: 获取 API 根信息
    console.log("=== 示例 1: API 根信息 ===");
    const root = await RickAndMortyAPI.getRoot();
    console.log("API 资源:", root);

    // 示例 2: 获取第一页角色
    console.log("\n=== 示例 2: 获取角色列表 ===");
    const characters = await RickAndMortyAPI.getCharacters(1);
    console.log(
      `总共 ${characters.info.count} 个角色, ${characters.info.pages} 页`
    );
    console.log(`本页角色数: ${characters.results.length}`);
    console.log(
      `前 3 个角色: ${characters.results
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")}`
    );

    // 示例 3: 获取 Rick Sanchez (ID: 1)
    console.log("\n=== 示例 3: 获取单个角色 ===");
    const rick = await RickAndMortyAPI.getCharacterById(1);
    console.log(`名字: ${rick.name}`);
    console.log(`状态: ${rick.status}`);
    console.log(`种族: ${rick.species}`);
    console.log(`性别: ${rick.gender}`);
    console.log(`起源: ${rick.origin.name}`);
    console.log(`当前位置: ${rick.location.name}`);
    console.log(`出现剧集数: ${rick.episode.length}`);

    // 示例 4: 筛选角色 - 查找所有活着的人类
    console.log("\n=== 示例 4: 筛选角色 ===");
    const aliveHumans = await RickAndMortyAPI.filterCharacters({
      status: "alive",
      species: "Human",
      page: 1,
    });
    console.log(`找到 ${aliveHumans.info.count} 个活着的人类`);
    console.log(
      `前 5 个: ${aliveHumans.results
        .slice(0, 5)
        .map((c) => c.name)
        .join(", ")}`
    );

    // 示例 5: 获取多个角色 (Rick, Morty, Summer)
    console.log("\n=== 示例 5: 批量获取角色 ===");
    const mainCharacters = await RickAndMortyAPI.getCharactersByIds([1, 2, 3]);
    console.log(`获取了 ${mainCharacters.length} 个角色:`);
    mainCharacters.forEach((char) => {
      console.log(`  - ${char.name} (${char.status})`);
    });

    // 示例 6: 获取位置信息
    console.log("\n=== 示例 6: 获取位置信息 ===");
    const earth = await RickAndMortyAPI.getLocationById(20); // Earth (C-137)
    console.log(`位置: ${earth.name}`);
    console.log(`类型: ${earth.type}`);
    console.log(`维度: ${earth.dimension}`);
    console.log(`居民数: ${earth.residents.length}`);

    // 示例 7: 获取剧集信息
    console.log("\n=== 示例 7: 获取剧集信息 ===");
    const firstEpisode = await RickAndMortyAPI.getEpisodeById(1);
    console.log(`剧集: ${firstEpisode.name}`);
    console.log(`编号: ${firstEpisode.episode}`);
    console.log(`首播日期: ${firstEpisode.air_date}`);
    console.log(`出场角色数: ${firstEpisode.characters.length}`);

    // 示例 8: 搜索剧集
    console.log("\n=== 示例 8: 搜索剧集 ===");
    const pilotEpisodes = await RickAndMortyAPI.filterEpisodes({
      name: "Pilot",
    });
    console.log(`找到 ${pilotEpisodes.info.count} 个包含 "Pilot" 的剧集`);
    pilotEpisodes.results.forEach((ep) => {
      console.log(`  - ${ep.episode}: ${ep.name}`);
    });

    // 示例 9: 分页遍历
    console.log("\n=== 示例 9: 分页遍历 ===");
    let totalCharacters = 0;
    for (let page = 1; page <= 3; page++) {
      const data = await RickAndMortyAPI.getCharacters(page);
      totalCharacters += data.results.length;
      console.log(`第 ${page} 页: ${data.results.length} 个角色`);
    }
    console.log(`前 3 页总共: ${totalCharacters} 个角色`);

    console.log("\n✅ 所有示例执行成功!");
  } catch (error) {
    console.error("\n❌ 错误:", error);
  }
}

// 如果直接运行此文件，执行示例
main();

// 导出 API 客户端供其他模块使用
export default RickAndMortyAPI;

// 导出类型
export type Character = z.infer<typeof CharacterSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
export type PaginatedResponse<T> = {
  info: z.infer<typeof InfoSchema>;
  results: T[];
};
