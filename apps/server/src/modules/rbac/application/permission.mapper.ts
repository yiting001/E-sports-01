import { PermissionNode } from '@app/contracts';
import { Permission } from '../domain/permission.entity';

/** 权限实体 → 扁平节点 */
function toNode(permission: Permission): PermissionNode {
  return {
    id: permission.id,
    parentId: permission.parentId,
    code: permission.code,
    name: permission.name,
    type: permission.type,
    path: permission.path,
    component: permission.component,
    apiMethod: permission.apiMethod,
    apiPath: permission.apiPath,
    icon: permission.icon,
    sort: permission.sort,
    children: [],
  };
}

/**
 * 将扁平权限列表组装为权限树。
 * 一次遍历建立 id→节点映射，再一次遍历挂载父子，复杂度 O(n)。
 */
export function buildPermissionTree(permissions: Permission[]): PermissionNode[] {
  const nodeMap = new Map<string, PermissionNode>();
  permissions.forEach((p) => nodeMap.set(p.id, toNode(p)));

  const roots: PermissionNode[] = [];
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}
