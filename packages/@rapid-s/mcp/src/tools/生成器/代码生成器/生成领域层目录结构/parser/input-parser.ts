/**
 * Domain Scaffold Generator - 输入解析器
 *
 * 将 DDD 结构化输入解析为 IR（中间表示）
 */

import { join } from "node:path";

import type {
  IRAggregateInfo,
  IRFileToWrite,
  IRGenerationPlan,
  IRLayerInfo,
  IRSubdomainInfo,
} from "../core/ir";
import type {
  AggregateType,
  DomainLayerType,
  InputType,
  SubdomainType,
} from "../types";
import { extractClassName } from "../utils";

/**
 * 输入解析器
 * 将用户输入的 DDD 结构转换为内部 IR
 */
export class InputParser {
  /**
   * 解析输入为生成计划
   */
  parse(input: InputType): IRGenerationPlan {
    const { outputPath, structure, options } = input;
    const context = structure.architecture.contexts[0];

    if (!context) {
      throw new Error("No context found in structure");
    }

    // 限界上下文路径 = outputPath + contextName
    const contextPath = join(outputPath, context.name);

    // 解析所有子域（子域在限界上下文目录下）
    const subdomains = context.subdomains.map((sd) =>
      this.parseSubdomain(sd, contextPath)
    );

    // 收集所有文件（扁平化）
    const allFiles = this.collectAllFiles(subdomains);

    return {
      outputPath,
      contextName: context.name,
      subdomains,
      options: {
        placeholderSuffix: options?.placeholderSuffix ?? ".keep",
        overwrite: options?.overwrite ?? false,
      },
      allFiles,
    };
  }

  /**
   * 解析子域
   */
  private parseSubdomain(
    subdomain: SubdomainType,
    basePath: string
  ): IRSubdomainInfo {
    // 验证子域名称必须存在且不能与 type 相同
    if (!subdomain.name || subdomain.name.trim() === "") {
      throw new Error(
        `Subdomain name is required. Got empty name with type: ${subdomain.type}`
      );
    }

    // 防止误将 type 作为 name（常见错误）
    const invalidNames = ["core-domain", "supporting-domain", "generic-domain"];
    if (invalidNames.includes(subdomain.name)) {
      throw new Error(
        `Invalid subdomain name "${subdomain.name}". ` +
        `This looks like a subdomain type, not a name. ` +
        `Please provide a meaningful subdomain name like "user-management", "wallet-account", etc.`
      );
    }

    const subdomainPath = join(basePath, subdomain.name);

    // 仅处理 domain 层
    const domainLayer = subdomain.layers.find(
      (l): l is DomainLayerType => l.name === "domain"
    );

    const layers: IRLayerInfo[] = [];

    if (domainLayer) {
      layers.push(this.parseDomainLayer(domainLayer, subdomainPath, subdomain.name));
    }

    return {
      name: subdomain.name,
      type: subdomain.type,
      description: subdomain.description,
      layers,
    };
  }

  /**
   * 解析领域层
   */
  private parseDomainLayer(
    layer: DomainLayerType,
    subdomainPath: string,
    subdomainName: string
  ): IRLayerInfo {
    const layerPath = join(subdomainPath, "domain");

    // 解析聚合
    const aggregates = (layer.aggregates ?? []).map((agg) =>
      this.parseAggregate(agg, layerPath, subdomainName)
    );

    // 解析服务
    const services = this.parseServices(
      layer.services ?? [],
      layerPath,
      subdomainName
    );

    // 解析异常
    const exceptions = this.parseExceptions(
      layer.exceptions,
      layerPath,
      subdomainName
    );

    return {
      name: "domain",
      aggregates,
      services,
      exceptions,
    };
  }

  /**
   * 解析聚合
   */
  private parseAggregate(
    aggregate: AggregateType,
    layerPath: string,
    subdomainName: string
  ): IRAggregateInfo {
    const aggregatePath = join(layerPath, aggregate.name);
    const files: IRFileToWrite[] = [];

    // 聚合根文件
    files.push(
      this.createFileIR(
        aggregate.root,
        aggregatePath,
        "aggregate",
        aggregate.name,
        subdomainName,
        aggregate.description
      )
    );

    // Repository 接口
    if (aggregate.repository) {
      files.push(
        this.createFileIR(
          aggregate.repository,
          aggregatePath,
          "repository",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 实体
    const entities = aggregate.files?.entities ?? [];
    for (const entity of entities) {
      const entityName = typeof entity === "string" ? entity : entity.name;
      const entityDesc =
        typeof entity === "object" ? entity.description : undefined;

      files.push(
        this.createFileIR(
          entityName,
          join(aggregatePath, "entities"),
          "entity",
          aggregate.name,
          subdomainName,
          entityDesc
        )
      );
    }

    // 实体目录 index
    if (entities.length > 0) {
      files.push(
        this.createFileIR(
          "index.ts",
          join(aggregatePath, "entities"),
          "index",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 值对象
    const valueObjects = aggregate.files?.["value-objects"] ?? [];
    for (const vo of valueObjects) {
      files.push(
        this.createFileIR(
          vo,
          join(aggregatePath, "value-objects"),
          "value-object",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 值对象目录 index
    if (valueObjects.length > 0) {
      files.push(
        this.createFileIR(
          "index.ts",
          join(aggregatePath, "value-objects"),
          "index",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 状态
    const states = aggregate.files?.states ?? [];
    for (const state of states) {
      files.push(
        this.createFileIR(
          state,
          join(aggregatePath, "states"),
          "state",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 状态目录 index
    if (states.length > 0) {
      files.push(
        this.createFileIR(
          "index.ts",
          join(aggregatePath, "states"),
          "index",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 事件
    const events = aggregate.files?.events ?? [];
    for (const event of events) {
      files.push(
        this.createFileIR(
          event,
          join(aggregatePath, "events"),
          "event",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 事件目录 index
    if (events.length > 0) {
      files.push(
        this.createFileIR(
          "index.ts",
          join(aggregatePath, "events"),
          "index",
          aggregate.name,
          subdomainName
        )
      );
    }

    // 聚合目录 index
    files.push(
      this.createFileIR(
        "index.ts",
        aggregatePath,
        "index",
        aggregate.name,
        subdomainName
      )
    );

    return {
      name: aggregate.name,
      description: aggregate.description,
      subdomain: subdomainName,
      layer: "domain",
      basePath: aggregatePath,
      files,
    };
  }

  /**
   * 解析服务列表
   */
  private parseServices(
    services: Array<{ name: string; description?: string }>,
    layerPath: string,
    subdomainName: string
  ): IRFileToWrite[] {
    if (services.length === 0) return [];

    const servicesPath = join(layerPath, "services");
    const files: IRFileToWrite[] = [];

    for (const service of services) {
      files.push(
        this.createFileIR(
          service.name,
          servicesPath,
          "service",
          undefined,
          subdomainName,
          service.description
        )
      );
    }

    // 服务目录 index
    files.push(
      this.createFileIR(
        "index.ts",
        servicesPath,
        "index",
        undefined,
        subdomainName
      )
    );

    return files;
  }

  /**
   * 解析异常定义
   */
  private parseExceptions(
    exceptions: { path: string; files: string[] } | undefined,
    layerPath: string,
    subdomainName: string
  ): IRFileToWrite[] {
    if (!exceptions) return [];

    const exceptionsPath = join(layerPath, exceptions.path);
    const files: IRFileToWrite[] = [];

    for (const file of exceptions.files) {
      files.push(
        this.createFileIR(
          file,
          exceptionsPath,
          "exception",
          undefined,
          subdomainName
        )
      );
    }

    // 异常目录 index
    files.push(
      this.createFileIR(
        "index.ts",
        exceptionsPath,
        "index",
        undefined,
        subdomainName
      )
    );

    return files;
  }

  /**
   * 创建文件 IR
   */
  private createFileIR(
    filename: string,
    dirPath: string,
    type: IRFileToWrite["type"],
    aggregate: string | undefined,
    subdomain: string,
    description?: string
  ): IRFileToWrite {
    return {
      path: join(dirPath, filename),
      filename,
      type,
      aggregate,
      subdomain,
      layer: "domain",
      description,
      className: extractClassName(filename),
    };
  }

  /**
   * 收集所有文件（扁平化）
   */
  private collectAllFiles(subdomains: IRSubdomainInfo[]): IRFileToWrite[] {
    const files: IRFileToWrite[] = [];

    for (const subdomain of subdomains) {
      for (const layer of subdomain.layers) {
        // 聚合内的文件
        for (const aggregate of layer.aggregates) {
          files.push(...aggregate.files);
        }
        // 服务文件
        files.push(...layer.services);
        // 异常文件
        files.push(...layer.exceptions);
      }
    }

    return files;
  }
}
