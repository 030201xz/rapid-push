/**
 * Utils 模块导出
 */

export {
  generateSchemaName,
  generateTypeName,
  inferModulePath,
  kebabToCamel,
  kebabToPascal,
} from "./naming";

export { hasDeprecatedV3Api, migrateZodV3ToV4 } from "./zod-migrator";
