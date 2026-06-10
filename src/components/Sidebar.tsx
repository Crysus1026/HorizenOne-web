import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Dispatch Board", href: "/dispatch" },
  { label: "Calendar", href: "/calendar" },
  { label: "Work Orders", href: "/work-orders" },
  { label: "Customers", href: "/customers" },
  { label: "Service Types", href: "/admin/service-types" },
  { label: "Admin", href: "/admin" },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-800 bg-slate-950 p-4 md:block">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">HorizenOne</h1>
        <p className="text-sm text-slate-500">Operations Platform</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}