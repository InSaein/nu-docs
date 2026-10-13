export type PortalRole = "STUDENT" | "REGISTRAR" | "TREASURY";

export function isPortalRole(role: unknown): role is PortalRole {
  return role === "STUDENT" || role === "REGISTRAR" || role === "TREASURY";
}

export function portalHomePath(role: PortalRole): string {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "REGISTRAR":
      return "/registrar/dashboard";
    case "TREASURY":
      return "/treasury/dashboard";
  }
}
