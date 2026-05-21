# M1 性能基线采样说明（T7）

目标：

1. 统一小/中/大场景基线口径。
2. 产出可复现的 P50/P95 指标文件。
3. 复用现有 perf gate 验证阈值与回归趋势。

## 一、场景口径

1. small：`10k`
2. medium：`50k`
3. large：`100k`
4. mixed：`mixed(text/image/path)`（补充场景）

## 二、执行命令

1. 生成基线（从一个或多个 report 聚合）：

```bash
node ./scripts/perf-baseline.mjs \
  --report ./scripts/perf-gate.report.template.json \
  --output ./docs/product-requirements/m1-performance-baseline.json
```

2. 运行 gate 验证：

```bash
node ./scripts/perf-gate.mjs \
  --report ./docs/product-requirements/m1-performance-baseline.json \
  --config ./scripts/perf-gate.config.json
```

3. package script 快捷方式：

```bash
pnpm perf:baseline
pnpm perf:baseline:check
```

## 三、当前基线摘要（2026-05-21）

1. `10k`：frameTimeMs P50/P95 = 11.2 / 11.2，hitTestMs P50/P95 = 1.6 / 1.6
2. `50k`：frameTimeMs P50/P95 = 14.8 / 14.8，hitTestMs P50/P95 = 2.9 / 2.9
3. `100k`：frameTimeMs P50/P95 = 19.6 / 19.6，hitTestMs P50/P95 = 3.7 / 3.7
4. `mixed(text/image/path)`：frameTimeMs P50/P95 = 15.1 / 15.1，hitTestMs P50/P95 = 3.1 / 3.1

数据文件：`docs/product-requirements/m1-performance-baseline.json`
