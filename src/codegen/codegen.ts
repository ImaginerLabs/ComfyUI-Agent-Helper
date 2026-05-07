import type { WorkflowHandle } from '../types.js';
import { getWorkflow } from '../workflow/workflow.js';

export interface CodegenOptions {
  /** 引入的包名，默认 'comfyui-agent-helper' */
  packageName?: string;
  /** 是否生成 import 语句，默认 true（测试时可设为 false） */
  includeImports?: boolean;
}

export function workflowToCode(handle: WorkflowHandle, options: CodegenOptions = {}): string {
  const wf = getWorkflow(handle);
  if (!wf) {
    throw new Error(`Workflow not found: ${handle.id}`);
  }

  const pkg = options.packageName ?? 'comfyui-agent-helper';
  const includeImports = options.includeImports !== false;
  const lines: string[] = [];
  const usedFunctions = new Set<string>(['createWorkflow']);

  if (wf.steps.size > 0) usedFunctions.add('addStep');
  if (wf.crossLinks.length > 0) usedFunctions.add('connectSteps');
  usedFunctions.add('compose');

  // import 语句
  if (includeImports) {
    const imports = Array.from(usedFunctions).sort().join(', ');
    lines.push(`import { ${imports} } from '${pkg}';`);
    lines.push('');
  }

  // createWorkflow
  if (wf.name) {
    lines.push(`const wf = createWorkflow({ name: ${JSON.stringify(wf.name)} });`);
  } else {
    lines.push('const wf = createWorkflow();');
  }
  lines.push('');

  // 生成每个 Step 的 addStep 调用
  const stepIds = Array.from(wf.steps.keys());
  for (const stepId of stepIds) {
    const step = wf.steps.get(stepId)!;
    emitAddStep(lines, stepId, step);
    lines.push('');
  }

  // 生成跨 Step 连接
  for (const link of wf.crossLinks) {
    lines.push('connectSteps(wf,');
    lines.push(`  { stepId: ${JSON.stringify(link.from.stepId)}, portId: ${JSON.stringify(link.from.portId)} },`);
    lines.push(`  { stepId: ${JSON.stringify(link.to.stepId)}, portId: ${JSON.stringify(link.to.portId)} }`);
    lines.push(');');
    lines.push('');
  }

  // compose
  lines.push('const result = compose(wf.id);');

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// 辅助格式化
// ---------------------------------------------------------------------------

/** [string, number] → `["id", 0]` */
function tupleSN(a: string, b: number): string {
  return `[${JSON.stringify(a)}, ${b}]`;
}

/** [string, string] → `["id", "name"]` */
function tupleSS(a: string, b: string): string {
  return `[${JSON.stringify(a)}, ${JSON.stringify(b)}]`;
}

// ---------------------------------------------------------------------------
// Step 生成
// ---------------------------------------------------------------------------

function emitAddStep(lines: string[], _stepId: string, step: import('../types.js').StepDefinition): void {
  lines.push('addStep(wf, {');
  lines.push(`  id: ${JSON.stringify(step.id)},`);
  lines.push(`  name: ${JSON.stringify(step.name)},`);

  if (step.description) {
    lines.push(`  description: ${JSON.stringify(step.description)},`);
  }

  // nodes
  lines.push('  nodes: [');
  for (const node of step.nodes) {
    lines.push('    {');
    lines.push(`      id: ${JSON.stringify(node.id)},`);
    lines.push(`      type: ${JSON.stringify(node.type)},`);
    if (node.title) {
      lines.push(`      title: ${JSON.stringify(node.title)},`);
    }
    if (node.widgets && Object.keys(node.widgets).length > 0) {
      lines.push('      widgets: {');
      for (const [key, val] of Object.entries(node.widgets)) {
        lines.push(`        ${JSON.stringify(key)}: ${formatWidgetValue(val)},`);
      }
      lines.push('      },');
    }
    if (node.pos) {
      lines.push(`      pos: [${node.pos[0]}, ${node.pos[1]}],`);
    }
    lines.push('    },');
  }
  lines.push('  ],');

  // internalLinks
  lines.push('  internalLinks: [');
  for (const link of step.internalLinks) {
    lines.push(`    { from: ${tupleSN(link.from[0], link.from[1])}, to: ${tupleSS(link.to[0], link.to[1])} },`);
  }
  lines.push('  ],');

  // inputs
  if (step.inputs && step.inputs.length > 0) {
    lines.push('  inputs: [');
    for (const port of step.inputs) {
      lines.push('    {');
      lines.push(`      id: ${JSON.stringify(port.id)},`);
      lines.push(`      label: ${JSON.stringify(port.label)},`);
      if (port.type) {
        lines.push(`      type: ${JSON.stringify(port.type)},`);
      }
      lines.push(`      target: ${tupleSS(port.target[0], port.target[1])}`);
      lines.push('    },');
    }
    lines.push('  ],');
  }

  // outputs
  if (step.outputs && step.outputs.length > 0) {
    lines.push('  outputs: [');
    for (const port of step.outputs) {
      lines.push('    {');
      lines.push(`      id: ${JSON.stringify(port.id)},`);
      lines.push(`      label: ${JSON.stringify(port.label)},`);
      if (port.type) {
        lines.push(`      type: ${JSON.stringify(port.type)},`);
      }
      lines.push(`      source: ${tupleSN(port.source[0], port.source[1])}`);
      lines.push('    },');
    }
    lines.push('  ],');
  }

  if (step.position) {
    lines.push(`  position: { x: ${step.position.x}, y: ${step.position.y} },`);
  }

  lines.push('});');
}

// ---------------------------------------------------------------------------
// 值格式化
// ---------------------------------------------------------------------------

function formatWidgetValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return JSON.stringify(val);
    return String(val);
  }
  if (typeof val === 'string') return formatStringValue(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.map((v) => formatWidgetValue(v));
    const inline = `[${items.join(', ')}]`;
    if (inline.length <= 80) return inline;
    return `[\n    ${items.join(',\n    ')}\n  ]`;
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return JSON.stringify(val);
}

function formatStringValue(s: string): string {
  // 多行字符串使用模板字面量（内容原样保留，不加缩进）
  if (s.includes('\n')) {
    const escaped = s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    return '`' + escaped + '`';
  }
  // 单行字符串：优先单引号，需要转义时用双引号，都有时用模板字面量
  if (!s.includes("'")) return `'${s}'`;
  if (!s.includes('"')) return `"${s}"`;
  return '`' + s.replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
}
