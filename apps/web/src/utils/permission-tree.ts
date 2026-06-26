import type { PermissionNode } from '@app/contracts';

/** 虚拟分组节点 id 前缀，用于和真实权限（UUID）区分 */
export const GROUP_ID_PREFIX = 'group:';

/** 权限树展示节点：叶子为真实权限，分组为按命名空间派生的虚拟文件夹 */
export interface PermissionTreeNode {
  /** 真实权限为 UUID；分组为 GROUP_ID_PREFIX + 命名空间路径 */
  id: string;
  /** 展示名：分组取命名空间段，叶子取权限名称 */
  label: string;
  /** 分组取命名空间路径（如 rbac:user），叶子取权限码 */
  code: string;
  /** 是否为虚拟分组节点 */
  isGroup: boolean;
  /** 叶子对应的真实权限；分组为 null */
  permission: PermissionNode | null;
  children: PermissionTreeNode[];
}

/** 展开成扁平的真实权限列表（兼容后端可能返回的嵌套结构） */
function flatten(nodes: PermissionNode[]): PermissionNode[] {
  const out: PermissionNode[] = [];
  const walk = (list: PermissionNode[]): void => {
    for (const node of list) {
      out.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return out;
}

/** 分组在前、叶子在后，同类按名称排序，保证展示稳定 */
function sortNodes(nodes: PermissionTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.isGroup !== b.isGroup) {
      return a.isGroup ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
  for (const node of nodes) {
    if (node.children.length) {
      sortNodes(node.children);
    }
  }
}

/**
 * 按权限码命名空间（以 ":" 分段）将平铺权限组织成嵌套树。
 * 中间分段生成虚拟分组文件夹，末段挂载真实权限为叶子；
 * 层级完全由 code 派生，无需后端 parentId，也无硬编码模块名。
 */
export function buildNamespaceTree(nodes: PermissionNode[]): PermissionTreeNode[] {
  const roots: PermissionTreeNode[] = [];
  const groupIndex = new Map<string, PermissionTreeNode>();

  for (const perm of flatten(nodes)) {
    const segments = perm.code.split(':');
    let siblings = roots;
    let path = '';

    for (let i = 0; i < segments.length - 1; i += 1) {
      path = path ? `${path}:${segments[i]}` : segments[i];
      let group = groupIndex.get(path);
      if (!group) {
        group = {
          id: GROUP_ID_PREFIX + path,
          label: segments[i],
          code: path,
          isGroup: true,
          permission: null,
          children: [],
        };
        groupIndex.set(path, group);
        siblings.push(group);
      }
      siblings = group.children;
    }

    siblings.push({
      id: perm.id,
      label: perm.name,
      code: perm.code,
      isGroup: false,
      permission: perm,
      children: [],
    });
  }

  sortNodes(roots);
  return roots;
}

/** 从勾选/半选 key 中仅保留真实权限 id（剔除虚拟分组） */
export function pickRealPermissionIds(keys: string[]): string[] {
  return keys.filter((key) => !key.startsWith(GROUP_ID_PREFIX));
}
