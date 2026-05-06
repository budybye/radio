import type { RpcTarget } from "capnweb";

declare global {
  interface Env {
    Bindings: CloudflareEnv;
    Variables: {
      rpc: RpcTarget;
    };
  }
}
