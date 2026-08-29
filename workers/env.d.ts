declare global {
  interface __BaseEnv_CloudflareEnv {
    /** Local e2e dummy mpc-bridge base URL; omit in production. */
    MPC_BRIDGE_BASE_URL?: string;
  }

  interface Env {
    Bindings: CloudflareEnv;
    MPC_BRIDGE_BASE_URL?: string;
  }
}

export {};
