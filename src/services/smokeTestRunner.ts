import { supabase } from "@/integrations/supabase/client";

// Test result types
export type TestStatus = "not_tested" | "pass" | "fail" | "running";

export interface TestResult {
  status: "pass" | "fail";
  duration: number;
  error?: string;
}

export interface TestCase {
  id: string;
  operation: "create" | "read" | "update" | "deactivate" | "restore";
  label: string;
  status: TestStatus;
  duration?: number;
  error?: string;
  testedAt?: string;
}

export interface ModuleTestSuite {
  id: string;
  name: string;
  path: string;
  tests: TestCase[];
}

// Unique prefix for test data to identify and cleanup
const TEST_PREFIX = "__SMOKE_TEST__";
const getTestName = () => `${TEST_PREFIX}${Date.now()}`;

// ==================== COUNTRIES TEST RUNNER ====================
let countriesTestRecordId: string | null = null;

async function countriesRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("countries")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function countriesCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    const testName = getTestName();
    const { data, error } = await supabase
      .from("countries")
      .insert({ name: testName, code: testName.slice(0, 10) })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    countriesTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function countriesUpdate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!countriesTestRecordId) throw new Error("No test record to update");
    const { error } = await supabase
      .from("countries")
      .update({ name: `${TEST_PREFIX}UPDATED_${Date.now()}` })
      .eq("id", countriesTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function countriesDeactivate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!countriesTestRecordId) throw new Error("No test record to deactivate");
    const { error } = await supabase
      .from("countries")
      .update({ is_active: false })
      .eq("id", countriesTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function countriesRestore(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!countriesTestRecordId) throw new Error("No test record to restore");
    const { error } = await supabase
      .from("countries")
      .update({ is_active: true })
      .eq("id", countriesTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function countriesCleanup(): Promise<void> {
  if (countriesTestRecordId) {
    await supabase.from("countries").delete().eq("id", countriesTestRecordId);
    countriesTestRecordId = null;
  }
  // Also cleanup any orphaned test records
  await supabase.from("countries").delete().like("name", `${TEST_PREFIX}%`);
}

// ==================== INDUSTRY SEGMENTS TEST RUNNER ====================
let industryTestRecordId: string | null = null;

async function industryRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("industry_segments")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function industryCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    const testName = getTestName();
    const { data, error } = await supabase
      .from("industry_segments")
      .insert({ name: testName, code: testName.slice(0, 10) })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    industryTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function industryUpdate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!industryTestRecordId) throw new Error("No test record to update");
    const { error } = await supabase
      .from("industry_segments")
      .update({ name: `${TEST_PREFIX}UPDATED_${Date.now()}` })
      .eq("id", industryTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function industryDeactivate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!industryTestRecordId) throw new Error("No test record to deactivate");
    const { error } = await supabase
      .from("industry_segments")
      .update({ is_active: false })
      .eq("id", industryTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function industryRestore(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!industryTestRecordId) throw new Error("No test record to restore");
    const { error } = await supabase
      .from("industry_segments")
      .update({ is_active: true })
      .eq("id", industryTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function industryCleanup(): Promise<void> {
  if (industryTestRecordId) {
    await supabase.from("industry_segments").delete().eq("id", industryTestRecordId);
    industryTestRecordId = null;
  }
  await supabase.from("industry_segments").delete().like("name", `${TEST_PREFIX}%`);
}

// ==================== ORGANIZATION TYPES TEST RUNNER ====================
let orgTypeTestRecordId: string | null = null;

async function orgTypeRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("organization_types")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function orgTypeCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    const testName = getTestName();
    const { data, error } = await supabase
      .from("organization_types")
      .insert({ name: testName, code: testName.slice(0, 10) })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    orgTypeTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function orgTypeUpdate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!orgTypeTestRecordId) throw new Error("No test record to update");
    const { error } = await supabase
      .from("organization_types")
      .update({ name: `${TEST_PREFIX}UPDATED_${Date.now()}` })
      .eq("id", orgTypeTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function orgTypeDeactivate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!orgTypeTestRecordId) throw new Error("No test record to deactivate");
    const { error } = await supabase
      .from("organization_types")
      .update({ is_active: false })
      .eq("id", orgTypeTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function orgTypeRestore(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!orgTypeTestRecordId) throw new Error("No test record to restore");
    const { error } = await supabase
      .from("organization_types")
      .update({ is_active: true })
      .eq("id", orgTypeTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function orgTypeCleanup(): Promise<void> {
  if (orgTypeTestRecordId) {
    await supabase.from("organization_types").delete().eq("id", orgTypeTestRecordId);
    orgTypeTestRecordId = null;
  }
  await supabase.from("organization_types").delete().like("name", `${TEST_PREFIX}%`);
}

// ==================== PARTICIPATION MODES TEST RUNNER ====================
let modeTestRecordId: string | null = null;

async function modeRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("participation_modes")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function modeCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    const testName = getTestName();
    const { data, error } = await supabase
      .from("participation_modes")
      .insert({ name: testName, code: testName.slice(0, 10) })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    modeTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function modeUpdate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!modeTestRecordId) throw new Error("No test record to update");
    const { error } = await supabase
      .from("participation_modes")
      .update({ name: `${TEST_PREFIX}UPDATED_${Date.now()}` })
      .eq("id", modeTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function modeDeactivate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!modeTestRecordId) throw new Error("No test record to deactivate");
    const { error } = await supabase
      .from("participation_modes")
      .update({ is_active: false })
      .eq("id", modeTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function modeRestore(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!modeTestRecordId) throw new Error("No test record to restore");
    const { error } = await supabase
      .from("participation_modes")
      .update({ is_active: true })
      .eq("id", modeTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function modeCleanup(): Promise<void> {
  if (modeTestRecordId) {
    await supabase.from("participation_modes").delete().eq("id", modeTestRecordId);
    modeTestRecordId = null;
  }
  await supabase.from("participation_modes").delete().like("name", `${TEST_PREFIX}%`);
}

// ==================== EXPERTISE LEVELS TEST RUNNER ====================
let expertiseTestRecordId: string | null = null;

async function expertiseRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("expertise_levels")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function expertiseCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    const testName = getTestName();
    const { data, error } = await supabase
      .from("expertise_levels")
      .insert({ name: testName, level_number: 999, min_years: 0 })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    expertiseTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function expertiseUpdate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!expertiseTestRecordId) throw new Error("No test record to update");
    const { error } = await supabase
      .from("expertise_levels")
      .update({ name: `${TEST_PREFIX}UPDATED_${Date.now()}` })
      .eq("id", expertiseTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function expertiseDeactivate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!expertiseTestRecordId) throw new Error("No test record to deactivate");
    const { error } = await supabase
      .from("expertise_levels")
      .update({ is_active: false })
      .eq("id", expertiseTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function expertiseRestore(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!expertiseTestRecordId) throw new Error("No test record to restore");
    const { error } = await supabase
      .from("expertise_levels")
      .update({ is_active: true })
      .eq("id", expertiseTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function expertiseCleanup(): Promise<void> {
  if (expertiseTestRecordId) {
    await supabase.from("expertise_levels").delete().eq("id", expertiseTestRecordId);
    expertiseTestRecordId = null;
  }
  await supabase.from("expertise_levels").delete().like("name", `${TEST_PREFIX}%`);
}

// ==================== ACADEMIC TAXONOMY TEST RUNNER ====================
let disciplineTestRecordId: string | null = null;
let streamTestRecordId: string | null = null;
let subjectTestRecordId: string | null = null;

async function academicDisciplinesRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("academic_disciplines")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function academicDisciplinesCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    const testName = getTestName();
    const { data, error } = await supabase
      .from("academic_disciplines")
      .insert({ name: testName })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    disciplineTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function academicStreamsRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("academic_streams")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function academicStreamsCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!disciplineTestRecordId) throw new Error("No discipline to create stream under");
    const testName = getTestName();
    const { data, error } = await supabase
      .from("academic_streams")
      .insert({ name: testName, discipline_id: disciplineTestRecordId })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    streamTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function academicSubjectsRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("academic_subjects")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function academicSubjectsCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!streamTestRecordId) throw new Error("No stream to create subject under");
    const testName = getTestName();
    const { data, error } = await supabase
      .from("academic_subjects")
      .insert({ name: testName, stream_id: streamTestRecordId })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    subjectTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function academicCleanup(): Promise<void> {
  if (subjectTestRecordId) {
    await supabase.from("academic_subjects").delete().eq("id", subjectTestRecordId);
    subjectTestRecordId = null;
  }
  if (streamTestRecordId) {
    await supabase.from("academic_streams").delete().eq("id", streamTestRecordId);
    streamTestRecordId = null;
  }
  if (disciplineTestRecordId) {
    await supabase.from("academic_disciplines").delete().eq("id", disciplineTestRecordId);
    disciplineTestRecordId = null;
  }
  // Cleanup orphaned
  await supabase.from("academic_subjects").delete().like("name", `${TEST_PREFIX}%`);
  await supabase.from("academic_streams").delete().like("name", `${TEST_PREFIX}%`);
  await supabase.from("academic_disciplines").delete().like("name", `${TEST_PREFIX}%`);
}

// ==================== PROFICIENCY TAXONOMY TEST RUNNER ====================
let profAreaTestRecordId: string | null = null;
let subDomainTestRecordId: string | null = null;
let specialityTestRecordId: string | null = null;

async function proficiencyAreasRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("proficiency_areas")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function proficiencyAreasCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Need an industry segment first
    const { data: segments } = await supabase
      .from("industry_segments")
      .select("id")
      .limit(1)
      .single();
    
    if (!segments?.id) throw new Error("No industry segment found to create area under");
    
    const testName = getTestName();
    const { data, error } = await supabase
      .from("proficiency_areas")
      .insert({ name: testName, industry_segment_id: segments.id })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    profAreaTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function subDomainsRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("sub_domains")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function subDomainsCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!profAreaTestRecordId) throw new Error("No proficiency area to create sub-domain under");
    const testName = getTestName();
    const { data, error } = await supabase
      .from("sub_domains")
      .insert({ name: testName, proficiency_area_id: profAreaTestRecordId })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    subDomainTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function specialitiesRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("specialities")
      .select("id, name")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function specialitiesCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!subDomainTestRecordId) throw new Error("No sub-domain to create speciality under");
    const testName = getTestName();
    const { data, error } = await supabase
      .from("specialities")
      .insert({ name: testName, sub_domain_id: subDomainTestRecordId })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    specialityTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function proficiencyCleanup(): Promise<void> {
  if (specialityTestRecordId) {
    await supabase.from("specialities").delete().eq("id", specialityTestRecordId);
    specialityTestRecordId = null;
  }
  if (subDomainTestRecordId) {
    await supabase.from("sub_domains").delete().eq("id", subDomainTestRecordId);
    subDomainTestRecordId = null;
  }
  if (profAreaTestRecordId) {
    await supabase.from("proficiency_areas").delete().eq("id", profAreaTestRecordId);
    profAreaTestRecordId = null;
  }
  // Cleanup orphaned
  await supabase.from("specialities").delete().like("name", `${TEST_PREFIX}%`);
  await supabase.from("sub_domains").delete().like("name", `${TEST_PREFIX}%`);
  await supabase.from("proficiency_areas").delete().like("name", `${TEST_PREFIX}%`);
}

// ==================== QUESTION BANK TEST RUNNER ====================
let questionTestRecordId: string | null = null;

async function questionsRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("question_bank")
      .select("id, question_text")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function questionsCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Need a speciality first
    const { data: specialities } = await supabase
      .from("specialities")
      .select("id")
      .limit(1)
      .single();
    
    if (!specialities?.id) throw new Error("No speciality found to create question under");
    
    const testName = getTestName();
    const { data, error } = await supabase
      .from("question_bank")
      .insert({
        question_text: testName,
        speciality_id: specialities.id,
        correct_option: 0,
        options: [
          { index: 0, text: "Option A" },
          { index: 1, text: "Option B" },
        ],
      })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    questionTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function questionsUpdate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!questionTestRecordId) throw new Error("No test record to update");
    const { error } = await supabase
      .from("question_bank")
      .update({ question_text: `${TEST_PREFIX}UPDATED_${Date.now()}` })
      .eq("id", questionTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function questionsDeactivate(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!questionTestRecordId) throw new Error("No test record to deactivate");
    const { error } = await supabase
      .from("question_bank")
      .update({ is_active: false })
      .eq("id", questionTestRecordId);
    if (error) throw error;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function questionsCleanup(): Promise<void> {
  if (questionTestRecordId) {
    await supabase.from("question_bank").delete().eq("id", questionTestRecordId);
    questionTestRecordId = null;
  }
  await supabase.from("question_bank").delete().like("question_text", `${TEST_PREFIX}%`);
}

// ==================== INVITATIONS TEST RUNNER ====================
let invitationTestRecordId: string | null = null;

async function invitationsRead(): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from("solution_provider_invitations")
      .select("id, email")
      .limit(5);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid response format");
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function invitationsCreate(): Promise<TestResult> {
  const start = Date.now();
  try {
    const testEmail = `${TEST_PREFIX}${Date.now()}@test.com`;
    const { data, error } = await supabase
      .from("solution_provider_invitations")
      .insert({
        email: testEmail,
        token: `test_token_${Date.now()}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error("No ID returned");
    invitationTestRecordId = data.id;
    return { status: "pass", duration: Date.now() - start };
  } catch (err: any) {
    return { status: "fail", duration: Date.now() - start, error: err.message };
  }
}

async function invitationsCleanup(): Promise<void> {
  if (invitationTestRecordId) {
    await supabase.from("solution_provider_invitations").delete().eq("id", invitationTestRecordId);
    invitationTestRecordId = null;
  }
  await supabase.from("solution_provider_invitations").delete().like("email", `${TEST_PREFIX}%`);
}

// ==================== TEST RUNNER MAP ====================
export interface ModuleTestConfig {
  id: string;
  name: string;
  path: string;
  tests: {
    id: string;
    operation: string;
    label: string;
    run: () => Promise<TestResult>;
  }[];
  cleanup: () => Promise<void>;
}

export const moduleTestConfigs: ModuleTestConfig[] = [
  {
    id: "countries",
    name: "Countries",
    path: "/admin/master-data/countries",
    tests: [
      { id: "countries-read", operation: "read", label: "View list", run: countriesRead },
      { id: "countries-create", operation: "create", label: "Create new", run: countriesCreate },
      { id: "countries-update", operation: "update", label: "Edit existing", run: countriesUpdate },
      { id: "countries-deactivate", operation: "deactivate", label: "Deactivate", run: countriesDeactivate },
      { id: "countries-restore", operation: "restore", label: "Restore", run: countriesRestore },
    ],
    cleanup: countriesCleanup,
  },
  {
    id: "industry-segments",
    name: "Industry Segments",
    path: "/admin/master-data/industry-segments",
    tests: [
      { id: "industry-read", operation: "read", label: "View list", run: industryRead },
      { id: "industry-create", operation: "create", label: "Create new", run: industryCreate },
      { id: "industry-update", operation: "update", label: "Edit existing", run: industryUpdate },
      { id: "industry-deactivate", operation: "deactivate", label: "Deactivate", run: industryDeactivate },
      { id: "industry-restore", operation: "restore", label: "Restore", run: industryRestore },
    ],
    cleanup: industryCleanup,
  },
  {
    id: "organization-types",
    name: "Organization Types",
    path: "/admin/master-data/organization-types",
    tests: [
      { id: "org-read", operation: "read", label: "View list", run: orgTypeRead },
      { id: "org-create", operation: "create", label: "Create new", run: orgTypeCreate },
      { id: "org-update", operation: "update", label: "Edit existing", run: orgTypeUpdate },
      { id: "org-deactivate", operation: "deactivate", label: "Deactivate", run: orgTypeDeactivate },
      { id: "org-restore", operation: "restore", label: "Restore", run: orgTypeRestore },
    ],
    cleanup: orgTypeCleanup,
  },
  {
    id: "participation-modes",
    name: "Participation Modes",
    path: "/admin/master-data/participation-modes",
    tests: [
      { id: "modes-read", operation: "read", label: "View list", run: modeRead },
      { id: "modes-create", operation: "create", label: "Create new", run: modeCreate },
      { id: "modes-update", operation: "update", label: "Edit existing", run: modeUpdate },
      { id: "modes-deactivate", operation: "deactivate", label: "Deactivate", run: modeDeactivate },
      { id: "modes-restore", operation: "restore", label: "Restore", run: modeRestore },
    ],
    cleanup: modeCleanup,
  },
  {
    id: "expertise-levels",
    name: "Expertise Levels",
    path: "/admin/master-data/expertise-levels",
    tests: [
      { id: "expertise-read", operation: "read", label: "View list", run: expertiseRead },
      { id: "expertise-create", operation: "create", label: "Create new", run: expertiseCreate },
      { id: "expertise-update", operation: "update", label: "Edit existing", run: expertiseUpdate },
      { id: "expertise-deactivate", operation: "deactivate", label: "Deactivate", run: expertiseDeactivate },
      { id: "expertise-restore", operation: "restore", label: "Restore", run: expertiseRestore },
    ],
    cleanup: expertiseCleanup,
  },
  {
    id: "academic-taxonomy",
    name: "Academic Taxonomy",
    path: "/admin/master-data/academic-taxonomy",
    tests: [
      { id: "academic-disciplines-read", operation: "read", label: "View Disciplines", run: academicDisciplinesRead },
      { id: "academic-disciplines-create", operation: "create", label: "Create Discipline", run: academicDisciplinesCreate },
      { id: "academic-streams-read", operation: "read", label: "View Streams", run: academicStreamsRead },
      { id: "academic-streams-create", operation: "create", label: "Create Stream", run: academicStreamsCreate },
      { id: "academic-subjects-read", operation: "read", label: "View Subjects", run: academicSubjectsRead },
      { id: "academic-subjects-create", operation: "create", label: "Create Subject", run: academicSubjectsCreate },
    ],
    cleanup: academicCleanup,
  },
  {
    id: "proficiency-taxonomy",
    name: "Proficiency Taxonomy",
    path: "/admin/master-data/proficiency-taxonomy",
    tests: [
      { id: "proficiency-areas-read", operation: "read", label: "View Areas", run: proficiencyAreasRead },
      { id: "proficiency-areas-create", operation: "create", label: "Create Area", run: proficiencyAreasCreate },
      { id: "proficiency-subdomains-read", operation: "read", label: "View Sub-domains", run: subDomainsRead },
      { id: "proficiency-subdomains-create", operation: "create", label: "Create Sub-domain", run: subDomainsCreate },
      { id: "proficiency-specialities-read", operation: "read", label: "View Specialities", run: specialitiesRead },
      { id: "proficiency-specialities-create", operation: "create", label: "Create Speciality", run: specialitiesCreate },
    ],
    cleanup: proficiencyCleanup,
  },
  {
    id: "question-bank",
    name: "Question Bank",
    path: "/admin/questions",
    tests: [
      { id: "questions-read", operation: "read", label: "View questions", run: questionsRead },
      { id: "questions-create", operation: "create", label: "Create question", run: questionsCreate },
      { id: "questions-update", operation: "update", label: "Edit question", run: questionsUpdate },
      { id: "questions-deactivate", operation: "deactivate", label: "Deactivate", run: questionsDeactivate },
    ],
    cleanup: questionsCleanup,
  },
  {
    id: "invitations",
    name: "Invitations",
    path: "/admin/invitations",
    tests: [
      { id: "invitations-read", operation: "read", label: "View invitations", run: invitationsRead },
      { id: "invitations-create", operation: "create", label: "Send invitation", run: invitationsCreate },
    ],
    cleanup: invitationsCleanup,
  },
];
