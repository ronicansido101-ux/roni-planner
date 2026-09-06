import { z } from "zod";
import { getPlannerState, savePlannerState } from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  planner: router({
    get: protectedProcedure.query(({ ctx }) => getPlannerState(ctx.user.id)),
    save: protectedProcedure
      .input(z.object({ data: z.string().min(2).max(250000) }))
      .mutation(({ ctx, input }) => savePlannerState(ctx.user.id, input.data)),
  }),
});

export type AppRouter = typeof appRouter;
