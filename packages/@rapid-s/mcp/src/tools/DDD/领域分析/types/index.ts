/**
 * 类型导出入口
 */

// 领域模型
export type {
  AnalysisMeta,
  AnalysisStats,
  AggregateRoot,
  BaseDomainElement,
  BoundedContext,
  DecoratorInfo,
  DomainElementType,
  DomainEvent,
  DomainEventMetadata,
  DomainRelation,
  DomainService,
  DomainState,
  Entity,
  MethodInfo,
  ParameterInfo,
  PropertyInfo,
  RelationType,
  Repository,
  RepositoryMethod,
  StateTransition,
  SubdomainInfo,
  ValueObject,
} from "./domain-models";

// 输入
export {
  inputSchema,
  analysisOptionsSchema,
  type InputType,
  type AnalysisOptions,
} from "./input.schema";

// 输出
export {
  outputSchema,
  propertyInfoSchema,
  parameterInfoSchema,
  methodInfoSchema,
  decoratorInfoSchema,
  boundedContextSchema,
  aggregateRootSchema,
  entitySchema,
  valueObjectSchema,
  domainEventSchema,
  domainEventMetadataSchema,
  domainServiceSchema,
  domainStateSchema,
  repositorySchema,
  domainRelationSchema,
  type OutputType,
} from "./output.schema";
