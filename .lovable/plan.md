

# Plan: Seed Test Data for Solution Requests Assignment Module

## Current State
- **3 marketplace challenges** exist, all linked to org `9ebd0ad5-...`
- **Challenge 1** ("Patient Engagement Platform Redesign"): Has R3, R5_MP, R6_MP, R7_MP assigned — but only 1 R7_MP (needs 2). **Partially assigned.**
- **Challenge 2** ("AI-Driven Supply Chain Optimization"): Has R3, R5_MP, R6_MP assigned — missing R7_MP. **Partially assigned.**
- **Challenge 3** ("Green Energy Transition Advisory"): **No assignments at all. Pending.**
- **Only 1 pool member** exists (Srinivasa Rao). Expert Reviewer requires min 2 unique members, so you can't fully staff any challenge.

## What's Needed
1. **Add 4 more pool members** to the resource pool with varied role capabilities so you can test full assignment workflows including R7_MP (min 2 required)
2. **Add 1 new challenge** linked to VSR Industries (the verified org) with zero assignments for a clean "Pending Assignment" test case

## Seed Data Details

### 4 New Pool Members (`platform_provider_pool`)
| Name | Email | Role Codes | Availability |
|------|-------|-----------|--------------|
| Priya Sharma | priya.sharma@test.example.com | R3, R5_MP, R7_MP | available |
| Rajesh Kumar | rajesh.kumar@test.example.com | R6_MP, R7_MP | available |
| Anita Desai | anita.desai@test.example.com | R3, R5_MP, R6_MP | available |
| Mark Thompson | mark.thompson@test.example.com | R7_MP, R5_MP | available |

### 1 New Challenge (`challenges`)
- Title: "Digital Literacy Program for Rural Communities"
- Organization: VSR Industries (`3ebb4c6e-...`)
- Engagement model: Marketplace (`ae032091-...`)
- Status: active, no assignments

## SQL Migration
A single migration inserting 4 pool members and 1 challenge. No schema changes, no RLS changes — just data inserts into existing tables.

## Impact
- Zero code changes needed
- The Solution Requests page will immediately show the new challenge as "Pending Assignment"
- Existing partially-assigned challenges gain enough pool members for full team staffing
- All 4 MP roles (R3, R5_MP, R6_MP, R7_MP) are covered with enough members to satisfy min_required constraints

