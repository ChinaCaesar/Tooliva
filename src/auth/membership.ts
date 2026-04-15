/**
 * 授权层占位实现，后续可接入本地许可证或在线会员鉴权。
 */
export class MembershipService {
  public hasToolAccess(_toolId: string): boolean {
    return true;
  }
}

export const membershipService = new MembershipService();
