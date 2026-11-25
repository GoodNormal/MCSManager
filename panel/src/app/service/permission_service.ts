import userSystem from "./user_service";
import { ROLE, User } from "../entity/user";

export function managesNode(user: User | undefined | null, daemonId: string) {
  return (
    !!user &&
    (isTopPermission(user) ||
      (user.permission === ROLE.NODE_ADMIN && user.nodeIds?.includes(daemonId)))
  );
}

export function isHaveInstance(user: User, daemonId: string, instanceUuid: string) {
  if (isTopPermission(user)) return true;
  if (!user || user.permission < ROLE.USER || instanceUuid === "global0001") return false;
  if (user.permission === ROLE.NODE_ADMIN)
    return (
      typeof instanceUuid === "string" &&
      /^[a-f0-9]{32}$/i.test(instanceUuid) &&
      managesNode(user, daemonId)
    );
  if (user.instances) {
    for (const v of user.instances) {
      if (daemonId === v.daemonId && instanceUuid === v.instanceUuid) return true;
    }
  }
  return false;
}

export function isTopPermission(user: User) {
  if (!user) return false;
  return user.permission >= 10;
}

export function isTopPermissionByUuid(uuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return isTopPermission(user);
}

export function isHaveInstanceByUuid(uuid: string, daemonId: string, instanceUuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return isHaveInstance(user, daemonId, instanceUuid);
}

export function getUserByUserName(userName: string) {
  return userSystem.getUserByUserName(userName);
}
