import { useAreas, useSubareas, useProfiles, useMemberships } from '@/hooks/useSupabaseData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

interface OrgNode {
  id: string;
  name: string;
  position: string;
  avatar?: string | null;
  children: OrgNode[];
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function PersonCard({ node, isRoot }: { node: OrgNode; isRoot?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 bg-card border rounded-xl p-4 shadow-sm min-w-[160px] max-w-[200px] ${isRoot ? 'border-primary/30 shadow-md' : ''}`}>
      {isRoot ? (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
      ) : (
        <Avatar className="w-16 h-16">
          {node.avatar && <AvatarImage src={node.avatar} alt={node.name} />}
          <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
            {getInitials(node.name)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="text-center">
        <p className="font-semibold text-sm leading-tight">{isRoot ? 'Dirección General' : node.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{isRoot ? 'Organigrama' : node.position}</p>
      </div>
    </div>
  );
}

function OrgLevel({ nodes }: { nodes: OrgNode[] }) {
  const [expanded, setExpanded] = useState(true);

  if (nodes.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="rounded-full h-8 px-3 text-xs gap-1"
        onClick={() => setExpanded(!expanded)}
      >
        {nodes.length}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </Button>

      {expanded && (
        <>
          <div className="flex flex-col items-center">
            <div className="w-px h-4 bg-border" />
            {nodes.length > 1 && (
              <div className="relative flex items-start justify-center" style={{ width: `${nodes.length * 220}px` }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border" style={{ width: `${(nodes.length - 1) * 220}px` }} />
                {nodes.map((_, i) => (
                  <div key={i} className="flex flex-col items-center" style={{ width: '220px' }}>
                    <div className="w-px h-4 bg-border" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {nodes.map(node => (
              <div key={node.id} className="flex flex-col items-center gap-2">
                <PersonCard node={node} />
                {node.children.length > 0 && (
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-px h-4 bg-border" />
                    <OrgLevel nodes={node.children} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Organigrama() {
  const { data: areas = [], isLoading } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: profiles = [] } = useProfiles();

  if (isLoading) return <div className="bg-card rounded-xl border shadow-sm p-6 text-center text-muted-foreground">Cargando organigrama...</div>;

  const getProfile = (userId: string | null) => profiles.find(p => p.id === userId);

  // Build tree: root -> area leaders -> subarea leaders
  const root: OrgNode = {
    id: 'root',
    name: 'Dirección General',
    position: 'Organigrama',
    children: [],
  };

  areas.forEach(area => {
    const leader = getProfile(area.leader_user_id);
    const areaNode: OrgNode = {
      id: area.id,
      name: leader?.name ?? area.name,
      position: leader?.position ?? `Líder de ${area.name}`,
      avatar: leader?.avatar,
      children: [],
    };

    const areaSubs = subareas.filter(s => s.area_id === area.id);
    areaSubs.forEach(sub => {
      const subLeader = getProfile(sub.leader_user_id);
      areaNode.children.push({
        id: sub.id,
        name: subLeader?.name ?? sub.name,
        position: subLeader?.position ?? `Líder de ${sub.name}`,
        avatar: subLeader?.avatar,
        children: [],
      });
    });

    root.children.push(areaNode);
  });

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-6">Organigrama</h2>
      <div className="flex flex-col items-center gap-2 min-w-max pb-4">
        <PersonCard node={root} isRoot />
        <div className="w-px h-4 bg-border" />
        <OrgLevel nodes={root.children} />
      </div>
    </div>
  );
}
