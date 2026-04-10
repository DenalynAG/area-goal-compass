import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoorOpen, Package } from "lucide-react";
import ControlAccesoPage from "./ControlAccesoPage";
import ControlActivosPage from "./ControlActivosPage";

export default function SeguridadControlPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Seguridad y Control</h1>
      <Tabs defaultValue="acceso" className="w-full">
        <TabsList>
          <TabsTrigger value="acceso" className="gap-2">
            <DoorOpen className="h-4 w-4" />
            Control de Acceso Interno
          </TabsTrigger>
          <TabsTrigger value="activos" className="gap-2">
            <Package className="h-4 w-4" />
            Control de Activos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="acceso">
          <ControlAccesoPage embedded />
        </TabsContent>
        <TabsContent value="activos">
          <ControlActivosPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
