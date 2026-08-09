import {
  MENU_DEFINITIONS,
  MENU_GROUPS,
  type PermissionNode,
} from '@app/contracts';

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

/** 无菜单承载的权限命名空间中文名，菜单命名空间会从 contracts 菜单定义自动补齐 */
const BASE_NAMESPACE_LABELS: Record<string, string> = {
  rbac: '角色与权限',
  upload: '文件管理',
  'upload:file': '文件上传',
  observability: '可观测性',
  'observability:log': '日志管理',
  wallet: '钱包管理',
  'wallet:admin': '钱包管理',
  realname: '实名管理',
  feedback: '反馈管理',
  booster: '打手管理',
  'booster:level': '打手等级',
  'booster:deposit': '打手押金',
  member: '会员管理',
  'member:level': '会员等级',
  order: '订单管理',
  'order:admin': '订单管理',
  review: '评论管理',
  'review:admin': '评论管理',
  finance: '财务管理',
  'finance:withdrawal': '提现管理',
  'finance:penalty': '罚款管理',
  'finance:tax': '税务管理',
  penalty: '罚款管理',
  dashboard: '工作台',
  im: '即时通讯',
  'im:message': '消息记录',
  'im:conversation': '会话管理',
  'im:service': '客服工作台',
  invite: '邀请管理',
  'invite:config': '邀请配置',
  'invite:record': '邀请记录',
  player: '玩家管理',
  'player:level': '玩家等级',
};

const MENU_GROUP_LABELS = new Map(MENU_GROUPS.map((group) => [group.code, group.title]));

/** 从共享菜单定义提取菜单权限命名空间中文名，避免视图层重复维护模块标题 */
const MENU_NAMESPACE_LABELS = MENU_DEFINITIONS.reduce<Record<string, string>>((labels, menu) => {
  const segments = menu.code.split(':');
  const namespace = segments.slice(0, -1).join(':');
  if (namespace) {
    labels[namespace] = menu.title;
  }

  const root = segments[0];
  const groupLabel = menu.group ? MENU_GROUP_LABELS.get(menu.group) : undefined;
  if (groupLabel && menu.group === root && !labels[root]) {
    labels[root] = groupLabel;
  }
  return labels;
}, {});

const NAMESPACE_LABELS = {
  ...BASE_NAMESPACE_LABELS,
  ...MENU_NAMESPACE_LABELS,
};

/** 权限码命名空间展示名：已登记命名空间显示中文，未知扩展保持原始片段便于排查 */
function namespaceLabel(path: string, segment: string): string {
  return NAMESPACE_LABELS[path] ?? segment;
}

/** 展开成扁平的真实权限列表（兼容后端可能返回的嵌套结构） */
export function flattenPermissions(nodes: PermissionNode[]): PermissionNode[] {
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

  for (const perm of flattenPermissions(nodes)) {
    const segments = perm.code.split(':');
    let siblings = roots;
    let path = '';

    for (let i = 0; i < segments.length - 1; i += 1) {
      path = path ? `${path}:${segments[i]}` : segments[i];
      let group = groupIndex.get(path);
      if (!group) {
        group = {
          id: GROUP_ID_PREFIX + path,
          label: namespaceLabel(path, segments[i]),
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
