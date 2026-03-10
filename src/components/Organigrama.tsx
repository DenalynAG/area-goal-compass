import { useAreas, useSubareas, useProfiles, useMemberships } from '@/hooks/useSupabaseData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Users, Crown, ChevronDown, ChevronRight, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

interface CardProps {
  title: string;
  subtitle?: string;
  avatar?: string | null;
  icon?: React.ReactNode;
  variant?: 'hotel' | 'board' | 'director' | 'area' | 'subarea' | 'collaborator';
}

function OrgCard({ title, subtitle, avatar, icon, variant = 'area' }: CardProps) {
  const styles = {
    hotel: 'bg-primary text-primary-foreground border-primary shadow-lg',
    board: 'bg-accent text-accent-foreground border-accent shadow-md',
    director: 'bg-secondary text-secondary-foreground border-secondary shadow-md',
    area: 'bg-card text-card-foreground border shadow-sm',
    subarea: 'bg-muted/50 text-muted-foreground border border-border/60 shadow-none',
    collaborator: 'bg-background text-foreground border border-border/40 shadow-none',
  };

  const sizes = {
    hotel: 'min-w-[180px] md:min-w-[220px]',
    board: 'min-w-[160px] md:min-w-[200px]',
    director: 'min-w-[160px] md:min-w-[200px]',
    area: 'min-w-[140px] md:min-w-[170px] max-w-[200px]',
    subarea: 'min-w-[130px] md:min-w-[150px] max-w-[180px]',
    collaborator: 'min-w-[120px] md:min-w-[140px] max-w-[160px]',
  };

  const avatarSize = variant === 'collaborator' ? 'w-7 h-7' : 'w-10 h-10';
  const textSize = variant === 'collaborator' ? 'text-[10px]' : 'text-xs';

  return (
    <div className={cn(
      'flex flex-col items-center gap-1 rounded-xl px-3 py-2 md:px-4 md:py-3 transition-all hover:shadow-md',
      styles[variant],
      sizes[variant],
    )}>
      {icon ? (
        <div className={cn(avatarSize, 'rounded-full bg-background/20 flex items-center justify-center')}>
          {icon}
        </div>
      ) : avatar ? (
        <Avatar className={avatarSize}>
          <AvatarImage src={avatar} alt={title} />
          <AvatarFallback className={cn('font-semibold bg-primary/10 text-primary', textSize)}>
            {getInitials(title)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className={cn(avatarSize, 'rounded-full bg-muted flex items-center justify-center')}>
          <span className={cn('font-bold text-muted-foreground', textSize)}>{getInitials(title)}</span>
        </div>
      )}
      <div className="text-center">
        <p className={cn('font-semibold leading-tight', textSize)}>{title}</p>
        {subtitle && <p className="text-[9px] md:text-[10px] opacity-75 mt-0.5 leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
}

function Connector() {
  return <div className="w-px h-4 md:h-5 bg-border mx-auto" />;
}

function CollaboratorList({ members, profiles }: { members: any[]; profiles: any[] }) {
  const [show, setShow] = useState(false);
  if (members.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1 mt-1">
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <User className="w-3 h-3" />
        {show ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {members.length} colaborador{members.length > 1 ? 'es' : ''}
      </button>
      {show && (
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {members.map(m => {
            const p = profiles.find((pr: any) => pr.id === m.user_id);
            if (!p) return null;
            return (
              <OrgCard
                key={m.id}
                title={p.name}
                subtitle={p.position ?? ''}
                avatar={p.avatar}
                variant="collaborator"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function AreaBranch({ area, subareas, profiles, memberships, isMobile }: {
  area: any; subareas: any[]; profiles: any[]; memberships: any[]; isMobile: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const leader = area.leader_user_id ? profiles.find((p: any) => p.id === area.leader_user_id) : null;
  const areaSubs = subareas.filter((s: any) => s.area_id === area.id);
  const areaMembers = memberships.filter((m: any) => m.area_id === area.id && !m.subarea_id);

  if (area.name === 'Dirección General') return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-px h-4 bg-border" />
      <div
        className={cn('cursor-pointer', (areaSubs.length > 0 || areaMembers.length > 0) && 'group')}
        onClick={() => (areaSubs.length > 0 || areaMembers.length > 0) && setExpanded(!expanded)}
      >
        <OrgCard
          title={leader?.name ?? area.name}
          subtitle={leader?.position ?? `Líder de ${area.name}`}
          avatar={leader?.avatar}
          variant="area"
        />
      </div>
      {(areaSubs.length > 0 || areaMembers.length > 0) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {areaSubs.length > 0 && `${areaSubs.length} subárea${areaSubs.length > 1 ? 's' : ''}`}
          {areaSubs.length > 0 && areaMembers.length > 0 && ' · '}
          {areaMembers.length > 0 && `${areaMembers.length} colaborador${areaMembers.length > 1 ? 'es' : ''}`}
        </button>
      )}
      {expanded && (
        <div className="flex flex-col items-center gap-1 mt-1">
          {/* Collaborators directly in area (no subarea) */}
          <CollaboratorList members={areaMembers} profiles={profiles} />

          {areaSubs.length > 0 && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className={cn('flex justify-center gap-3', isMobile ? 'flex-col items-center' : 'flex-wrap')}>
                {areaSubs.map(sub => {
                  const subLeader = sub.leader_user_id ? profiles.find((p: any) => p.id === sub.leader_user_id) : null;
                  const subMembers = memberships.filter((m: any) => m.subarea_id === sub.id);
                  return (
                    <div key={sub.id} className="flex flex-col items-center">
                      <div className="w-px h-3 bg-border" />
                      <OrgCard
                        title={subLeader?.name ?? sub.name}
                        subtitle={subLeader?.position ?? sub.name}
                        avatar={subLeader?.avatar}
                        variant="subarea"
                      />
                      <CollaboratorList members={subMembers} profiles={profiles} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Organigrama() {
  const { data: areas = [], isLoading } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();
  const { data: memberships = [] } = useMemberships();
  const isMobile = useIsMobile();

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
    <div className="bg-card rounded-xl border shadow-sm p-4 md:p-6 overflow-x-auto">
      <div className={cn(
        'flex flex-col items-center gap-0 pb-4 mx-auto',
        isMobile ? 'min-w-0' : 'min-w-max'
      )}>
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

        {/* Nivel 4: Áreas */}
        <div className="flex items-start justify-center w-full">
          <div className="relative flex justify-center w-full">
            {!isMobile && otherAreas.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{ width: `${(otherAreas.length - 1) * 210}px`, left: '50%', transform: 'translateX(-50%)' }}
              />
            )}
            <div className={cn(
              'flex justify-center gap-3 md:gap-4',
              isMobile ? 'flex-col items-center' : 'flex-wrap'
            )}>
              {otherAreas.map(area => (
                <AreaBranch
                  key={area.id}
                  area={area}
                  subareas={subareas}
                  profiles={profiles}
                  memberships={memberships}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
