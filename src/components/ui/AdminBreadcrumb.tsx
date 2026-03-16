import { Link, useLocation } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

/** Map of admin route segments → Vietnamese labels */
const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  franchises: "Franchises",
  products: "Products",
  customers: "Customers",
  orders: "Orders",
  payments: "Payments",
  loyalty: "Loyalty",
  roles: "Roles",
  create: "Tạo mới",
  edit: "Chỉnh sửa",
  inventory: "Tồn kho",
  categories: "Danh mục",
};

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove /admin prefix
  const adminPrefix = ROUTER_URL.ADMIN; // "/admin"
  if (!pathname.startsWith(adminPrefix)) return [];

  const rest = pathname.slice(adminPrefix.length); // e.g. "/franchises/abc123/edit"
  const parts = rest.split("/").filter(Boolean); // ["franchises", "abc123", "edit"]

  if (parts.length === 0) return [];

  // First segment is always the main section (e.g. "franchises")
  const section = parts[0];
  const sectionLabel = segmentLabels[section] || section;

  // If we're on the list page itself, no breadcrumb needed (page has its own title)
  if (parts.length === 1) return [];

  const crumbs: BreadcrumbItem[] = [
    { label: sectionLabel, to: `${adminPrefix}/${section}` },
  ];

  // Walk remaining segments
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    const label = segmentLabels[seg];
    if (label) {
      // Known action segment
      crumbs.push({ label });
    } else {
      // ID segment — show "Chi tiết"
      crumbs.push({ label: "Chi tiết" });
    }
  }

  return crumbs;
}

const AdminBreadcrumb = () => {
  const { pathname } = useLocation();
  const crumbs = buildBreadcrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-white/50">
      {crumbs.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 && (
            <svg className="size-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {crumb.to && idx < crumbs.length - 1 ? (
            <Link to={crumb.to} className="hover:text-primary-400 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-white/80">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default AdminBreadcrumb;
