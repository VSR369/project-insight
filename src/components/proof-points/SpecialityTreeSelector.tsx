import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Folder, Tag, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Speciality {
  id: string;
  name: string;
  description?: string | null;
}

interface SubDomain {
  id: string;
  name: string;
  description?: string | null;
  specialities: Speciality[];
}

interface ProficiencyArea {
  id: string;
  name: string;
  description?: string | null;
  subDomains: SubDomain[];
}

interface SpecialityTreeSelectorProps {
  taxonomy: ProficiencyArea[];
  selectedSpecialityIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function SpecialityTreeSelector({
  taxonomy,
  selectedSpecialityIds,
  onChange,
  disabled,
  loading,
}: SpecialityTreeSelectorProps) {
  const [expandedSubDomains, setExpandedSubDomains] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>(taxonomy[0]?.id || '');

  // Calculate counts per area
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    taxonomy.forEach((area) => {
      let count = 0;
      area.subDomains.forEach((sd) => {
        sd.specialities.forEach((sp) => {
          if (selectedSpecialityIds.includes(sp.id)) {
            count++;
          }
        });
      });
      counts[area.id] = count;
    });
    return counts;
  }, [taxonomy, selectedSpecialityIds]);

  const toggleSubDomain = (subDomainId: string) => {
    const newExpanded = new Set(expandedSubDomains);
    if (newExpanded.has(subDomainId)) {
      newExpanded.delete(subDomainId);
    } else {
      newExpanded.add(subDomainId);
    }
    setExpandedSubDomains(newExpanded);
  };

  const toggleSpeciality = (specialityId: string) => {
    const newIds = selectedSpecialityIds.includes(specialityId)
      ? selectedSpecialityIds.filter((id) => id !== specialityId)
      : [...selectedSpecialityIds, specialityId];
    onChange(newIds);
  };

  const toggleAllInSubDomain = (subDomain: SubDomain) => {
    const subDomainSpecialityIds = subDomain.specialities.map((s) => s.id);
    const allSelected = subDomainSpecialityIds.every((id) =>
      selectedSpecialityIds.includes(id)
    );

    if (allSelected) {
      // Deselect all
      onChange(selectedSpecialityIds.filter((id) => !subDomainSpecialityIds.includes(id)));
    } else {
      // Select all
      const newIds = new Set([...selectedSpecialityIds, ...subDomainSpecialityIds]);
      onChange(Array.from(newIds));
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading expertise areas...</p>
        </CardContent>
      </Card>
    );
  }

  if (taxonomy.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No proficiency areas selected. Please select areas in the Expertise Selection step first, then return here to tag your proof points.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Select Your Declared Expertise Areas</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Optionally tag this proof point with your specialities. Selection is optional.
        </p>
      </div>

      {selectedSpecialityIds.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Selected:</span>
          <Badge variant="secondary" className="text-xs">
            {selectedSpecialityIds.length} specialit{selectedSpecialityIds.length !== 1 ? 'ies' : 'y'}
          </Badge>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto flex-wrap p-0">
              {taxonomy.map((area) => (
                <TabsTrigger
                  key={area.id}
                  value={area.id}
                  disabled={disabled}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <span className="truncate max-w-[120px]">{area.name}</span>
                  {areaCounts[area.id] > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs h-5 min-w-5">
                      {areaCounts[area.id]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {taxonomy.map((area) => (
              <TabsContent 
                key={area.id} 
                value={area.id} 
                className="m-0 p-4 max-h-[400px] overflow-y-auto"
              >
                <div className="space-y-2">
                  {area.subDomains.map((subDomain) => {
                    const isExpanded = expandedSubDomains.has(subDomain.id);
                    const subDomainSpecialityIds = subDomain.specialities.map((s) => s.id);
                    const selectedCount = subDomainSpecialityIds.filter((id) =>
                      selectedSpecialityIds.includes(id)
                    ).length;
                    const allSelected = selectedCount === subDomainSpecialityIds.length && subDomainSpecialityIds.length > 0;
                    const someSelected = selectedCount > 0 && !allSelected;

                    return (
                      <div key={subDomain.id} className="border rounded-lg">
                        {/* Sub-domain Header */}
                        <div
                          className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 ${
                            disabled ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => !disabled && toggleSubDomain(subDomain.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium flex-1 truncate">
                            {subDomain.name}
                          </span>
                          {selectedCount > 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {selectedCount}/{subDomainSpecialityIds.length}
                            </Badge>
                          )}
                          <Checkbox
                            checked={allSelected}
                            ref={(el) => {
                              if (el && someSelected) {
                                (el as HTMLButtonElement).dataset.state = 'indeterminate';
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!disabled) toggleAllInSubDomain(subDomain);
                            }}
                            disabled={disabled}
                            className="shrink-0"
                          />
                        </div>

                        {/* Specialities */}
                        {isExpanded && subDomain.specialities.length > 0 && (
                          <div className="border-t bg-muted/20 p-3 pl-10 space-y-2">
                            {subDomain.specialities.map((speciality) => (
                              <label
                                key={speciality.id}
                                className={`flex items-center gap-2 py-1 cursor-pointer ${
                                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={selectedSpecialityIds.includes(speciality.id)}
                                  onCheckedChange={() => !disabled && toggleSpeciality(speciality.id)}
                                  disabled={disabled}
                                />
                                <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-sm">{speciality.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        Speciality selection is optional. You can save without selecting any.
      </p>
    </div>
  );
}
