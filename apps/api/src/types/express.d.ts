import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface UserTokenPayload extends JwtPayload {
      sub: string;
      email: string;
      name: string;
    }

    interface Request {
      user?: UserTokenPayload;
    }
  }
}

export {};
