import { supabase } from "@/integrations/supabase/client";
import {
  manufacturingAutoComponentsTaxonomy,
  areaIdMap,
} from "@/data/manufacturing-auto-components-taxonomy";

export interface SeedResult {
  subDomainsCreated: number;
  specialitiesCreated: number;
  errors: string[];
}

/**
 * Seeds the Manufacturing (Auto Components) taxonomy data
 * Creates sub-domains and specialities for all 4 levels
 */
export async function seedManufacturingAutoComponentsTaxonomy(): Promise<SeedResult> {
  const result: SeedResult = {
    subDomainsCreated: 0,
    specialitiesCreated: 0,
    errors: [],
  };

  for (const level of manufacturingAutoComponentsTaxonomy) {
    const levelAreaMap = areaIdMap[level.levelNumber];
    if (!levelAreaMap) {
      result.errors.push(`No area mapping found for level ${level.levelNumber}`);
      continue;
    }

    for (const area of level.areas) {
      const areaId = levelAreaMap[area.name];
      if (!areaId) {
        result.errors.push(`No area ID found for "${area.name}" at level ${level.levelNumber}`);
        continue;
      }

      for (const subDomain of area.subDomains) {
        try {
          // Check if sub-domain already exists
          const { data: existingSD } = await supabase
            .from("sub_domains")
            .select("id")
            .eq("proficiency_area_id", areaId)
            .eq("name", subDomain.name)
            .maybeSingle();

          let subDomainId: string;

          if (existingSD) {
            subDomainId = existingSD.id;
          } else {
            // Create sub-domain
            const { data: newSD, error: sdError } = await supabase
              .from("sub_domains")
              .insert({
                name: subDomain.name,
                proficiency_area_id: areaId,
                display_order: subDomain.displayOrder,
                is_active: true,
              })
              .select("id")
              .single();

            if (sdError) {
              result.errors.push(`Failed to create sub-domain "${subDomain.name}": ${sdError.message}`);
              continue;
            }

            subDomainId = newSD.id;
            result.subDomainsCreated++;
          }

          // Create specialities
          for (const speciality of subDomain.specialities) {
            // Check if speciality already exists
            const { data: existingSp } = await supabase
              .from("specialities")
              .select("id")
              .eq("sub_domain_id", subDomainId)
              .eq("name", speciality.name)
              .maybeSingle();

            if (!existingSp) {
              const { error: spError } = await supabase
                .from("specialities")
                .insert({
                  name: speciality.name,
                  sub_domain_id: subDomainId,
                  display_order: speciality.displayOrder,
                  is_active: true,
                });

              if (spError) {
                result.errors.push(`Failed to create speciality "${speciality.name}": ${spError.message}`);
              } else {
                result.specialitiesCreated++;
              }
            }
          }
        } catch (error) {
          result.errors.push(`Error processing sub-domain "${subDomain.name}": ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }
  }

  return result;
}
