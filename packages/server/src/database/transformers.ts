/** TypeORM bigint 列转 number（毫秒时间戳、文件大小均在安全整数范围内） */
export const bigintTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};
