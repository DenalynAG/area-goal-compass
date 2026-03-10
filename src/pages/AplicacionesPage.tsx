import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";

interface AppItem {
  name: string;
  description: string;
  url: string;
  logo: string;
  color: string;
}

const apps: AppItem[] = [
  {
    name: "Booking",
    description: "Gestión de reservas online",
    url: "https://www.booking.com",
    logo: "https://cf.bstatic.com/static/img/favicon/9ca83ba2a5a3293ff07452cb24949a5843f55474.svg",
    color: "bg-blue-900",
  },
  {
    name: "Buk",
    description: "Gestión de recursos humanos",
    url: "https://www.buk.co",
    logo: "https://www.buk.co/hubfs/buk-logo.svg",
    color: "bg-indigo-600",
  },
  {
    name: "Chattigo",
    description: "Plataforma de comunicación",
    url: "https://www.chattigo.com",
    logo: "",
    color: "bg-orange-500",
  },
  {
    name: "DigiDoc",
    description: "Sistema de gestión Facturas",
    url: "#",
    logo: "",
    color: "bg-amber-600",
  },
  {
    name: "Expedia",
    description: "Gestión de reservas",
    url: "https://www.expedia.com",
    logo: "",
    color: "bg-yellow-500",
  },
  {
    name: "Flexkeeping",
    description: "Gestión de housekeeping",
    url: "https://www.flexkeeping.com",
    logo: "",
    color: "bg-teal-600",
  },
  {
    name: "LinkedIn",
    description: "Red profesional para conectar talentos",
    url: "https://www.linkedin.com",
    logo: "",
    color: "bg-blue-700",
  },
  {
    name: "MySatcom",
    description: "Facturador electrónico POS",
    url: "#",
    logo: "",
    color: "bg-gray-700",
  },
  {
    name: "OneDrive",
    description: "Almacenamiento en la nube",
    url: "https://onedrive.live.com",
    logo: "",
    color: "bg-sky-500",
  },
  {
    name: "Opera Cloud",
    description: "Sistema de gestión hotelera",
    url: "#",
    logo: "",
    color: "bg-cyan-600",
  },
  {
    name: "Outlook",
    description: "Correo corporativo",
    url: "https://outlook.office.com",
    logo: "",
    color: "bg-blue-600",
  },
  {
    name: "Plantillas Marketing Corporativas",
    description: "SharePoint de Plantillas Corporativas",
    url: "#",
    logo: "",
    color: "bg-teal-700",
  },
  {
    name: "Power Automate",
    description: "Automatización de procesos",
    url: "https://flow.microsoft.com",
    logo: "",
    color: "bg-blue-500",
  },
  {
    name: "Power BI",
    description: "Business Intelligence y reportes",
    url: "https://app.powerbi.com",
    logo: "",
    color: "bg-amber-500",
  },
  {
    name: "Reporteador de Simphony",
    description: "Reporteador de Simphony",
    url: "#",
    logo: "",
    color: "bg-red-600",
  },
];

export default function AplicacionesPage() {
  const [search, setSearch] = useState("");

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img
          src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
          alt="OSH"
          className="w-12 h-12 rounded-xl object-contain"
        />
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Portal de Aplicaciones OSH Hotels
          </h1>
          <p className="text-sm text-muted-foreground">
            Acceso a aplicativos corporativos
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar Aplicación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((app) => (
          <a
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:shadow-md hover:border-primary/30"
          >
            {/* Status dot */}
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />

            {/* Icon */}
            <div
              className={`w-14 h-14 rounded-xl ${app.color} flex items-center justify-center text-white font-bold text-xl shadow-sm`}
            >
              {app.name.charAt(0)}
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                {app.name}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {app.description}
              </p>
            </div>

            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors absolute top-2.5 left-2.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
