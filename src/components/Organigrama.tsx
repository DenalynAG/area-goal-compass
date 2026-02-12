import { useAreas, useSubareas, useProfiles } from '@/hooks/useSupabaseData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Users, Crown, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

interface CardProps {
  title: string;
  subtitle?: string;
  avatar?: string | null;
  icon?: React.ReactNode;
  variant?: 'hotel' | 'board' | 'director' | 'area' | 'subarea';
}

function OrgCard({ title, subtitle, avatar, icon, variant = 'area' }: CardProps) {
  const styles = {
    hotel: 'bg-primary text-primary-foreground border-primary shadow-lg min-w-[220px]',
    board: 'bg-accent text-accent-foreground border-accent shadow-md min-w-[200px]',
    director: 'bg-secondary text-secondary-foreground border-secondary shadow-md min-w-[200px]',
    area: 'bg-card text-card-foreground border shadow-sm min-w-[170px] max-w-[200px]',
    subarea: 'bg-muted/50 text-muted-foreground border border-border/60 shadow-none min-w-[150px] max-w-[180px]',
  };

  return (
    <div className={cn('flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 transition-all hover:shadow-md', styles[variant])}>
      {icon ? (
        <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center">
          {icon}
        </div>
      ) : avatar ? (
        <Avatar className="w-10 h-10">
          <AvatarImage src={avatar} alt={title} />
          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
            {getInitials(title)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">{getInitials(title)}</span>
        </div>
      )}
      <div className="text-center">
        <p className="font-semibold text-xs leading-tight">{title}</p>
        {subtitle && <p className="text-[10px] opacity-75 mt-0.5 leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
}

function Connector({ vertical = true }: { vertical?: boolean }) {
  if (vertical) return <div className="w-px h-5 bg-border mx-auto" />;
  return <div className="h-px flex-1 bg-border" />;
}

function TreeBranch({ count }: { count: number }) {
  if (count <= 1) return <Connector />;
  return (
    <div className="flex flex-col items-center w-full">
      <Connector />
      <div className="relative w-full flex justify-center">
        <div className="absolute top-0 h-px bg-border" style={{ width: `${Math.min(100, (count - 1) * 100 / count)}%` }} />
      </div>
    </div>
  );
}

function AreaBranch({ area, subareas, profiles }: { area: any; subareas: any[]; profiles: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const leader = area.leader_user_id ? profiles.find((p: any) => p.id === area.leader_user_id) : null;
  const areaSubs = subareas.filter((s: any) => s.area_id === area.id);

  // Skip "Dirección General" area since it's shown at top
  if (area.name === 'Dirección General') return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-px h-4 bg-border" />
      <div
        className={cn('cursor-pointer', areaSubs.length > 0 && 'group')}
        onClick={() => areaSubs.length > 0 && setExpanded(!expanded)}
      >
        <OrgCard
          title={leader?.name ?? area.name}
          subtitle={leader?.position ?? `Líder de ${area.name}`}
          avatar={leader?.avatar}
          variant="area"
        />
      </div>
      {areaSubs.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {areaSubs.length} subárea{areaSubs.length > 1 ? 's' : ''}
        </button>
      )}
      {expanded && areaSubs.length > 0 && (
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="w-px h-3 bg-border" />
          <div className="flex flex-wrap justify-center gap-3">
            {areaSubs.map(sub => {
              const subLeader = sub.leader_user_id ? profiles.find((p: any) => p.id === sub.leader_user_id) : null;
              return (
                <div key={sub.id} className="flex flex-col items-center">
                  <div className="w-px h-3 bg-border" />
                  <OrgCard
                    title={subLeader?.name ?? sub.name}
                    subtitle={subLeader?.position ?? sub.name}
                    avatar={subLeader?.avatar}
                    variant="subarea"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Organigrama() {
  const { data: areas = [], isLoading } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground">
        Cargando organigrama...
      </div>
    );
  }

  const dirArea = areas.find(a => a.name === 'Dirección General');
  const dirLeader = dirArea?.leader_user_id ? profiles.find(p => p.id === dirArea.leader_user_id) : null;
  const otherAreas = areas.filter(a => a.name !== 'Dirección General');

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6 overflow-x-auto">
      <div className="flex flex-col items-center gap-0 min-w-max pb-4 mx-auto">
        {/* Nivel 1: Hotel */}
        <OrgCard
          title="Hotel OSH Cartagena"
          subtitle="Organización"
          icon={<Building2 className="w-5 h-5 text-primary-foreground" />}
          variant="hotel"
        />

        <Connector />

        {/* Nivel 2: Junta Directiva */}
        <OrgCard
          title="Junta Directiva"
          subtitle="Órgano de gobierno"
          icon={<Crown className="w-5 h-5 text-accent-foreground" />}
          variant="board"
        />

        <Connector />

        {/* Nivel 3: Director General */}
        <OrgCard
          title={dirLeader?.name ?? 'Director General'}
          subtitle={dirLeader?.position ?? 'Director General'}
          avatar={dirLeader?.avatar}
          icon={!dirLeader ? <Users className="w-5 h-5 text-secondary-foreground" /> : undefined}
          variant="director"
        />

        <Connector />

        {/* Nivel 4: Líderes de Área */}
        <div className="flex items-start justify-center">
          <div className="relative flex justify-center">
            {/* Línea horizontal conectora */}
            {otherAreas.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{ width: `${(otherAreas.length - 1) * 210}px`, left: '50%', transform: 'translateX(-50%)' }}
              />
            )}
            <div className="flex flex-wrap justify-center gap-4">
              {otherAreas.map(area => (
                <AreaBranch key={area.id} area={area} subareas={subareas} profiles={profiles} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
