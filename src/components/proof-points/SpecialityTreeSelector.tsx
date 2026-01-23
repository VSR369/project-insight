import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Folder, Tag, Info, X } from 'lucide-react';
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
  selectedSpecialityId: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function SpecialityTreeSelector({
  taxonomy,
  selectedSpecialityId,
  onChange,
  disabled,
  loading,
}: SpecialityTreeSelectorProps) {
  const [expandedSubDomains, setExpandedSubDomains] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('');

  // Sync activeTab when taxonomy changes - fixes the "jumping" bug
  useEffect(() => {
    if (taxonomy.length > 0) {
      const validIds = taxonomy.map(a => a.id);
      if (!activeTab || !validIds.includes(activeTab)) {
        setActiveTab(taxonomy[0].id);
      }
    }
  }, [taxonomy, activeTab]);

  // Find which area contains the selected speciality for badge display
  const selectedAreaId = useMemo(() => {
    if (!selectedSpecialityId) return null;
    for (const area of taxonomy) {
      for (const sd of area.subDomains) {
        if (sd.specialities.some(sp => sp.id === selectedSpecialityId)) {
          return area.id;
        }
      }
    }
    return null;
  }, [taxonomy, selectedSpecialityId]);

  // Get selected speciality name for display
  const selectedSpecialityName = useMemo(() => {
    if (!selectedSpecialityId) return null;
    for (const area of taxonomy) {
      for (const sd of area.subDomains) {
        const sp = sd.specialities.find(s => s.id === selectedSpecialityId);
        if (sp) return sp.name;
      }
    }
    return null;
  }, [taxonomy, selectedSpecialityId]);

  const toggleSubDomain = (subDomainId: string) => {
    setExpandedSubDomains(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(subDomainId)) {
        newExpanded.delete(subDomainId);
      } else {
        newExpanded.add(subDomainId);
      }
      return newExpanded;
    });
  };

  const handleSpecialitySelect = (specialityId: string) => {
    // Toggle selection - if already selected, deselect
    if (selectedSpecialityId === specialityId) {
      onChange(null);
    } else {
      onChange(specialityId);
    }
  };

  const handleClearSelection = () => {
    onChange(null);
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
        <Label className="text-base font-medium">Select One Speciality for This Proof Point</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Choose the most relevant speciality. You can create multiple proof points for different specialities.
        </p>
      </div>

      {selectedSpecialityId && selectedSpecialityName && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <Tag className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium flex-1">
            Selected: {selectedSpecialityName}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={disabled}
            className="h-6 px-2 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
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
                  {selectedAreaId === area.id && (
                    <Badge variant="default" className="ml-2 text-xs h-5 min-w-5 bg-primary">
                      1
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
                <RadioGroup
                  value={selectedSpecialityId || ''}
                  onValueChange={handleSpecialitySelect}
                  disabled={disabled}
                >
                  <div className="space-y-2">
                    {area.subDomains.map((subDomain) => {
                      const isExpanded = expandedSubDomains.has(subDomain.id);
                      const hasSelectedSpeciality = subDomain.specialities.some(
                        sp => sp.id === selectedSpecialityId
                      );

                      return (
                        <div key={subDomain.id} className="border rounded-lg">
                          {/* Sub-domain Header (expandable only, no checkbox) */}
                          <div
                            className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 ${
                              disabled ? 'opacity-50 cursor-not-allowed' : ''
                            } ${hasSelectedSpeciality ? 'bg-primary/5' : ''}`}
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
                            {hasSelectedSpeciality && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                Selected
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground shrink-0">
                              {subDomain.specialities.length} specialit{subDomain.specialities.length !== 1 ? 'ies' : 'y'}
                            </span>
                          </div>

                          {/* Specialities with Radio Buttons */}
                          {isExpanded && subDomain.specialities.length > 0 && (
                            <div className="border-t bg-muted/20 p-3 pl-10 space-y-2">
                              {subDomain.specialities.map((speciality) => (
                                <label
                                  key={speciality.id}
                                  className={`flex items-center gap-3 py-2 px-2 cursor-pointer rounded-md transition-colors ${
                                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
                                  } ${selectedSpecialityId === speciality.id ? 'bg-primary/10 border border-primary/20' : ''}`}
                                >
                                  <RadioGroupItem
                                    value={speciality.id}
                                    disabled={disabled}
                                    className="shrink-0"
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
                </RadioGroup>
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
