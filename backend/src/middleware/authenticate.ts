import type { NextFunction, Request, Response } from "express";

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: {
    accessToken: string;
    user: AuthenticatedUser;
  };
}

export type VerifyAccessToken = (accessToken: string) => Promise<AuthenticatedUser | null>;

export function createAuthenticateMiddleware(verifyAccessToken: VerifyAccessToken) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const authorization = request.header("Authorization");
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match?.[1]) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const user = await verifyAccessToken(match[1]);
      if (!user) {
        response.status(401).json({ error: "Invalid or expired access token" });
        return;
      }
      request.auth = { accessToken: match[1], user };
      next();
    } catch {
      response.status(401).json({ error: "Invalid or expired access token" });
    }
  };
}
