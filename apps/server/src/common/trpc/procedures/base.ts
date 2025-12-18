/**
 * 基础 Procedure
 * 包含全局中间件（计时、日志等）
 */

import { t, timingMiddleware } from '../init';

// ========== 基础 Procedure（带全局中间件） ==========
export const baseProcedure = t.procedure.use(timingMiddleware);
