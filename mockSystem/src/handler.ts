/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatDto } from './schema';
import { BillItem, BillListResponse } from './types/handler';
import { getTokens, randomString, verifyToken } from './utils';
import { checkAuthentication } from './utils/middleware';
import { storage } from './utils/storage';

export interface Context<D = any, Q = any> {
  uri: URL;
  request: Request;
  data: D;
  query: Q;
  headers: Record<string, any>;
  $__call: (controller: string, ctx: Context) => Promise<any>;
}

export type HandlerFunc<R = any> = (ctx: Context) => Promise<R>;

export const mockHandler = {
  post: {
    async register({ data }: Context) {
      const [user] = await storage.find('user', {
        matcher: (item) => item.name === data.name,
      });
      if (user) {
        return { __format: true, status: 400, data: { message: '用户名已存在' } };
      }
      try {
        const user = await storage.insert('user', data);
        return { success: true, ...(await getTokens({ id: user.id, permission: user.permission })) };
      } catch (e: any) {
        return { __format: true, status: 500, data: { message: e.message } };
      }
    },
    async login({ data }: Context) {
      const [user] = await storage.find('user', {
        matcher: (item) => item.name === data.name && item.password === data.password,
      });
      if (!user) return { __format: true, status: 400, data: { message: '用户名或密码错误' } };
      return { success: true, ...(await getTokens({ id: user.id, permission: user.permission })) };
    },
    async checkCaptcha({ data }: Context) {
      const { captcha, captchaId } = data;
      if (!captcha) return { __format: true, status: 400, data: { message: '验证码不能为空' } };
      if (!captchaId) return { __format: true, status: 400, data: { message: '验证码ID不能为空' } };
      const sessionInfo = await storage.findById('session', captchaId);
      if (!sessionInfo) return { __format: true, status: 400, data: { message: '验证码不存在' } };
      if (sessionInfo.expireTime < new Date()) {
        await storage.remove('session', sessionInfo);
        return { __format: true, status: 400, data: { message: '验证码已过期' } };
      }
      const sessionData = JSON.parse(sessionInfo.info);
      if (sessionData.captcha !== captcha) return { __format: true, status: 400, data: { message: '验证码错误' } };
      await storage.remove('session', sessionInfo);
      return { success: true };
    },
    createBill: checkAuthentication<BillItem, BillItem>(async ({ data, tokenData }) => {
      const bill = await storage.insert('bill', { ...data, date: new Date(data.date), userId: tokenData.id });
      return { success: true, data: { bill: formatDto('bill', bill, tokenData.permission) } };
    }),
  },
  get: {
    async captcha({ query }: Context) {
      if (!query.phone) return { __format: true, status: 400, data: { message: '手机号不能为空' } };
      const captcha = randomString(6);
      const sectionInfo = await storage.update('session', {
        id: randomString(16),
        info: JSON.stringify({ phone: query.phone, captcha }),
      });
      return { success: true, captchaId: sectionInfo.id, captcha };
    },
    async refresh({ query }: Context) {
      if (!query.refreshToken) return { __format: true, status: 400, data: { message: 'refreshToken不能为空' } };
      const [verify, errorMessage, payload] = await verifyToken(query.refreshToken, 'refresh');
      if (!verify) return { __format: true, status: 401, data: { message: errorMessage } };
      const { isRefresh, data } = payload;
      if (!isRefresh) return { __format: true, status: 401, data: { message: 'refreshToken无效' } };
      return { success: true, ...(await getTokens(data)) };
    },
    test: checkAuthentication(async ({ tokenData }) => {
      return { success: true, ...tokenData };
    }),
    getUserInfo: checkAuthentication(async ({ tokenData }) => {
      const { id } = tokenData;
      const user = await storage.findById('user', id);
      if (!user) return { __format: true, status: 400, data: { message: '用户不存在' } };
      if (user.isDeleted) return { __format: true, status: 400, data: { message: '用户已删除' } };
      return { success: true, data: { userInfo: formatDto('user', user, user.permission) } };
    }),
    bill: {
      list: checkAuthentication<BillListResponse>(async ({ query, tokenData }) => {
        const { id, permission } = tokenData;
        const { current, pageSize } = query;
        const bills = await storage.find('bill', { matcher: (item) => item.userId === id });
        return {
          success: true,
          bills: bills
            .slice((current - 1) * pageSize, current * pageSize)
            .map((item) => formatDto('bill', item, permission)),
        };
      }, true),
    },
  },
};
