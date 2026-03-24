#!/usr/bin/env python3
import json, os

skills_dir = "/Users/moe/Desktop/Mission Control App/src/config/skills"

def make_skill(skill_id, name, category, difficulty, freedom, trigger, context, instructions, output_template, variables, workflow_steps, checklist, tools, agents, pipelines, tags, description):
    return {
        "$schema": "https://docs.openclaw.ai/skills/schema.json",
        "id": skill_id,
        "name": name,
        "description": description,
        "category": category,
        "difficulty": difficulty,
        "freedom": freedom,
        "prompts": {
            "en": {
                "trigger": trigger,
                "context": context,
                "instructions": instructions,
                "output_template": output_template
            }
        },
        "variables": variables,
        "workflow": {"steps": workflow_steps},
        "examples": [{"input": "Create output for TechStart - a B2B SaaS company in fintech, targeting CFOs and Finance Directors in UAE", "output": "Full deliverable with all sections filled with B2B fintech context, data-driven insights, and actionable recommendations"}],
        "checklist": checklist,
        "tools": tools,
        "agents": agents,
        "pipelines": pipelines,
        "metadata": {"version": "1.0", "author": "agency", "tags": tags, "lastUpdated": "2026-03-24"}
    }

skills = {}

skills["ab-test-design"] = make_skill(
    "ab-test-design", "A/B Test Design", "media", "intermediate", "medium",
    "Use when designing split tests for campaigns, ads, landing pages, or any marketing element where you need to determine which variant performs better.",
    "You are a conversion rate optimization specialist with expertise in statistical testing, experimental design, and data-driven decision making.",
    "## A/B Test Design Workflow\n\nFollow this structured approach:\n\n- [ ] 1. Define objective: Clarify the primary metric ({{primary_metric}}) and secondary metrics\n- [ ] 2. Audience segmentation: Define which audience segment will be tested ({{audience_segment}})\n- [ ] 3. Hypothesis development: Document the specific change and expected outcome\n- [ ] 4. Variant creation: Design control (A) and variant (B) with single variable changes\n- [ ] 5. Sample size calculation: Determine required sample size for statistical significance\n- [ ] 6. Test duration: Set test duration based on traffic and minimum detectable effect\n- [ ] 7. Success criteria: Define what constitutes a winning variant\n\n## Key Inputs\n- Primary metric: {{primary_metric}}\n- Audience: {{audience_segment}}\n- Traffic volume: {{traffic_volume}}\n- Test element: {{test_element}}",
    "## A/B Test Design: {{test_element}}\n\n### Test Objective\n| Metric | Target | Measurement |\n|--------|--------|-------------|\n| Primary: {{primary_metric}} | | |\n\n### Hypothesis\n**If** [we change X], **then** [Y will happen], **because** [rationale].\n\n### Variants\n| Element | Control (A) | Variant (B) |\n|---------|-------------|-------------|\n| | | |\n\n### Statistical Parameters\n| Parameter | Value |\n|-----------|-------|\n| Baseline conversion | {{baseline}} |\n| MDE | {{mde}} |\n| Statistical power | 80% |\n| Significance level | 0.05 |\n| Required sample size | per variant |\n| Test duration | {{duration}} |\n\n### Success Criteria\n- [ ] Winner declared when: p-value < 0.05 AND effect size > MDE\n- [ ] Minimum test duration: {{min_duration}}\n\n### Traffic Allocation\n| Variant | Percentage | Expected daily visitors |\n|---------|------------|------------------------|\n| Control A | 50% | |\n| Variant B | 50% | |",
    [
        {"name": "primary_metric", "type": "string", "required": True, "description": "Primary KPI to optimize (CTR, conversion rate, engagement)"},
        {"name": "audience_segment", "type": "string", "required": True, "description": "Target audience for the test"},
        {"name": "traffic_volume", "type": "string", "required": True, "description": "Monthly visitor or user volume"},
        {"name": "test_element", "type": "string", "required": True, "description": "Element being tested (headline, CTA, image, etc.)"},
        {"name": "baseline", "type": "string", "required": False, "description": "Current baseline conversion rate"},
        {"name": "mde", "type": "string", "required": False, "description": "Minimum detectable effect percentage"}
    ],
    [
        {"step": 1, "name": "Define Objective", "action": "Identify the primary metric and what success looks like", "verify": "Metric is specific, measurable, and aligned to business goals"},
        {"step": 2, "name": "Segment Audience", "action": "Define which users will be included in the test", "verify": "Segment is large enough to reach significance"},
        {"step": 3, "name": "Develop Hypothesis", "action": "Document the specific change and expected outcome", "verify": "Hypothesis is specific and falsifiable"},
        {"step": 4, "name": "Design Variants", "action": "Create control and variant with single variable changes", "verify": "Only one element differs between variants"},
        {"step": 5, "name": "Calculate Sample Size", "action": "Use power analysis to determine required sample", "verify": "Sample size is statistically valid"},
        {"step": 6, "name": "Set Duration", "action": "Calculate test duration based on traffic and sample needs", "verify": "Duration accounts for full business cycles"}
    ],
    ["Hypothesis is specific and falsifiable", "Only one variable is changed between variants", "Sample size is sufficient for statistical power", "Test runs for full business cycle (min 1-2 weeks)", "Results are statistically significant (p < 0.05)", "Practical significance considered alongside statistical significance"],
    ["spreadsheet", "analytics", "web-search"], ["nova", "dex"], ["campaign-brief"], ["testing", "cro", "optimization", "data"],
    "Designs rigorous A/B tests for marketing campaigns, ads, and landing pages. Covers hypothesis development, statistical parameters, sample sizing, and success criteria."
)

skills["account-health"] = make_skill(
    "account-health", "Account Health Check", "client-services", "intermediate", "medium",
    "Use when reviewing the health of a client account, assessing relationship quality, or identifying accounts that need attention.",
    "You are a client services specialist focused on account health, relationship management, and early warning signals.",
    "## Account Health Check Workflow\n\nConduct a comprehensive health review:\n\n- [ ] 1. Revenue analysis: Review {{current_revenue}}, contract terms, and renewal timeline ({{renewal_date}})\n- [ ] 2. Satisfaction signals: Check NPS/feedback scores, escalations, and complaint patterns\n- [ ] 3. Engagement levels: Assess communication frequency, meeting attendance, and collaboration quality\n- [ ] 4. Performance review: Compare actual vs expected KPIs for {{account_name}}\n- [ ] 5. Competitive intel: Note any competitor activity or switching intent signals\n- [ ] 6. Risk scoring: Calculate overall health score and identify red flags\n\n## Account Details\n- Account: {{account_name}}\n- Industry: {{industry}}\n- Current revenue: {{current_revenue}}\n- Contract renewal: {{renewal_date}}",
    "## Account Health Report: {{account_name}}\n\n### Executive Summary\n[Overall health score (1-10) with 2-3 sentence overview]\n\n### 1. Revenue Health\n| Metric | Value | Status |\n|--------|-------|--------|\n| Current ARR | {{current_revenue}} | |\n| Contract terms | | |\n| Renewal date | {{renewal_date}} | |\n| Upsell potential | | |\n\n### 2. Satisfaction Indicators\n| Signal | Score/Count | Trend |\n|--------|-------------|-------|\n| NPS score | | |\n| Escalations (90d) | | |\n| Complaints | | |\n| Meeting engagement | | |\n\n### 3. Performance vs Expectations\n| KPI | Expected | Actual | Gap |\n|-----|----------|--------|-----|\n| | | | |\n\n### 4. Risk Assessment\n| Risk Factor | Level | Details |\n|-------------|-------|---------|\n| Revenue risk | | |\n| Relationship risk | | |\n| Competitive risk | | |\n\n### 5. Recommended Actions\n1. [Immediate action items]\n2. [Short-term interventions]\n3. [Long-term strategy adjustments]",
    [
        {"name": "account_name", "type": "string", "required": True, "description": "Client account name"},
        {"name": "industry", "type": "string", "required": True, "description": "Client industry"},
        {"name": "current_revenue", "type": "string", "required": True, "description": "Current annual revenue from account"},
        {"name": "renewal_date", "type": "string", "required": True, "description": "Contract renewal or expiry date"},
        {"name": "nps_score", "type": "string", "required": False, "description": "Most recent NPS score"},
        {"name": "competitors", "type": "string", "required": False, "description": "Known competing agencies"}
    ],
    [
        {"step": 1, "name": "Revenue Review", "action": "Analyze revenue health and contract terms", "verify": "Revenue and renewal timeline confirmed"},
        {"step": 2, "name": "Satisfaction Analysis", "action": "Review satisfaction signals and feedback", "verify": "NPS and sentiment data gathered"},
        {"step": 3, "name": "Engagement Assessment", "action": "Evaluate relationship quality and communication", "verify": "Communication patterns understood"},
        {"step": 4, "name": "Performance Review", "action": "Compare actual vs expected KPIs", "verify": "Performance gaps identified"},
        {"step": 5, "name": "Risk Scoring", "action": "Calculate health score and flag concerns", "verify": "Risk level determined"}
    ],
    ["Revenue trajectory and renewal risk assessed", "Satisfaction signals reviewed and trends identified", "Engagement patterns documented", "Performance gaps analyzed", "Risk score calculated with evidence", "Action plan created with timeline"],
    ["spreadsheet", "analytics"], ["sage", "piper"], [], ["account-management", "client-health", "retention"],
    "Reviews client account health across revenue, satisfaction, engagement, and performance. Generates health scores and recommended actions."
)

skills["account-management-framework"] = make_skill(
    "account-management-framework", "Account Management Framework", "client-services", "advanced", "medium",
    "Use when setting up account management processes, designing client onboarding/offboarding, or establishing scalable client service operations.",
    "You are an agency operations expert specializing in client account management frameworks, service delivery, and relationship systems.",
    "## Account Management Framework Design\n\nBuild a scalable account management system:\n\n- [ ] 1. Account classification: Define segmentation criteria ({{segmentation_criteria}}) and tier structure\n- [ ] 2. Service model design: Map service levels to account tiers ({{tier_structure}})\n- [ ] 3. Handoff protocols: Define how accounts move between tiers or team members\n- [ ] 4. Communication cadences: Set meeting rhythms and reporting schedules per tier\n- [ ] 5. Escalation paths: Define when and how issues escalate ({{escalation_matrix}})\n- [ ] 6. Growth mechanisms: Design upsell, cross-sell, and expansion triggers\n- [ ] 7. Review cycles: Set quarterly and annual account review processes\n\n## Inputs\n- Segmentation: {{segmentation_criteria}}\n- Tier structure: {{tier_structure}}\n- Team size: {{team_size}}",
    "## Account Management Framework\n\n### Account Segmentation\n| Tier | Criteria | # of Accounts | Service Level |\n|------|----------|---------------|---------------|\n| Strategic | | | |\n| Growth | | | |\n| Standard | | | |\n\n### Service Model by Tier\n| Element | Strategic | Growth | Standard |\n|---------|-----------|--------|---------|\n| Meeting cadence | | | |\n| Reporting | | | |\n| Response SLA | | | |\n\n### Handoff Protocols\n- Tier upgrade criteria:\n- Tier downgrade criteria:\n\n### Escalation Matrix\n| Issue Severity | First response | Resolution target | Escalate to |\n|----------------|-----------------|-------------------|-------------|\n| Critical | | | |\n| High | | | |\n| Medium | | | |\n| Low | | | |\n\n### Growth Triggers\n| Signal | Action | Owner |\n|--------|--------|-------|\n| Usage increase | | |\n| New department | | |\n| Satisfaction spike | | |",
    [
        {"name": "segmentation_criteria", "type": "string", "required": True, "description": "Criteria for segmenting accounts (revenue, industry, potential)"},
        {"name": "tier_structure", "type": "string", "required": True, "description": "Number of tiers and naming"},
        {"name": "team_size", "type": "string", "required": True, "description": "Size of account management team"},
        {"name": "avg_account_revenue", "type": "string", "required": False, "description": "Average revenue per account"},
        {"name": "churn_rate", "type": "string", "required": False, "description": "Current annual churn rate"}
    ],
    [
        {"step": 1, "name": "Segmentation", "action": "Define account classification criteria", "verify": "All accounts can be classified unambiguously"},
        {"step": 2, "name": "Service Model", "action": "Design service levels per tier", "verify": "Model is financially sustainable"},
        {"step": 3, "name": "Handoff Protocols", "action": "Define tier transition rules", "verify": "Handoffs are clear and objective"},
        {"step": 4, "name": "Cadences", "action": "Set communication rhythms per tier", "verify": "Cadences match tier value"},
        {"step": 5, "name": "Escalation Paths", "action": "Define escalation criteria and routes", "verify": "Escalation paths are clear to all parties"},
        {"step": 6, "name": "Growth Mechanisms", "action": "Design expansion triggers and processes", "verify": "Growth opportunities are systematically identified"}
    ],
    ["Segmentation criteria are objective and measurable", "Service model is financially viable", "Handoff criteria are documented and fair", "Communication cadences match tier value", "Escalation paths are clear to all team members", "Growth mechanisms are systematically tracked"],
    ["spreadsheet", "document", "presentation"], ["sage", "piper"], [], ["account-management", "operations", "framework"],
    "Designs scalable account management frameworks including segmentation, service models, handoff protocols, escalation paths, and growth mechanisms."
)

skills["ad-copy"] = make_skill(
    "ad-copy", "Ad Copywriting", "creative", "intermediate", "high",
    "Use when creating advertising copy for digital ads, social media ads, display ads, or any paid advertising formats.",
    "You are a creative copywriter specializing in digital advertising with expertise in conversion-focused messaging and platform-native ad formats.",
    "## Ad Copywriting Workflow\n\nCreate compelling advertising copy:\n\n- [ ] 1. Platform adaptation: Adapt copy for {{platform}} format and character limits\n- [ ] 2. Audience targeting: Write to {{target_audience}} pain points and desires\n- [ ] 3. Offer framing: Position {{offer}} with clear value proposition\n- [ ] 4. CTA development: Create compelling call-to-action ({{cta_text}})\n- [ ] 5. A/B variants: Produce multiple headline and body variations\n- [ ] 6. Compliance check: Ensure copy meets platform policies\n\n## Key Inputs\n- Platform: {{platform}}\n- Audience: {{target_audience}}\n- Offer: {{offer}}\n- CTA: {{cta_text}}",
    "## Ad Copy: {{client_name}} - {{campaign_name}}\n\n### Campaign Overview\n| Element | Details |\n|---------|---------|\n| Platform | {{platform}} |\n| Audience | {{target_audience}} |\n| Offer | {{offer}} |\n| CTA | {{cta_text}} |\n\n### Primary Ad Set\n\n**Headline 1** (max {{headline_limit}} chars):\n[Headline text]\n\n**Headline 2** (max {{headline_limit}} chars):\n[Headline text]\n\n**Description** (max {{desc_limit}} chars):\n[Body copy]\n\n**CTA Button:** {{cta_text}}\n\n### Variant Set\n| Variant | Headline | Description | CTA |\n|---------|----------|-------------|-----|\n| A | | | |\n| B | | | |\n| C | | | |\n\n### Compliance Notes\n- [ ] No false urgency\n- [ ] Pricing claims verified\n- [ ] Disclaimers included where required",
    [
        {"name": "platform", "type": "string", "required": True, "description": "Ad platform (Google, Meta, LinkedIn, TikTok, etc.)"},
        {"name": "target_audience", "type": "string", "required": True, "description": "Target audience description"},
        {"name": "offer", "type": "string", "required": True, "description": "Product or service being advertised"},
        {"name": "cta_text", "type": "string", "required": True, "description": "Desired call-to-action text"},
        {"name": "client_name", "type": "string", "required": True, "description": "Brand or client name"},
        {"name": "headline_limit", "type": "string", "required": False, "description": "Max headline characters"},
        {"name": "desc_limit", "type": "string", "required": False, "description": "Max description characters"}
    ],
    [
        {"step": 1, "name": "Platform Research", "action": "Understand platform specs and best practices", "verify": "Format requirements confirmed"},
        {"step": 2, "name": "Audience Insight", "action": "Identify audience pain points and desires", "verify": "Messaging resonates with target"},
        {"step": 3, "name": "Offer Positioning", "action": "Frame offer with clear value proposition", "verify": "Unique value is clear"},
        {"step": 4, "name": "CTA Development", "action": "Create compelling action-oriented CTAs", "verify": "CTA drives specific action"},
        {"step": 5, "name": "Variant Creation", "action": "Produce A/B test variations", "verify": "Variants test meaningful differences"}
    ],
    ["Copy matches platform format and character limits", "Headlines grab attention in first 3 words", "Value proposition is clear and specific", "CTA is action-oriented and specific", "At least 2 A/B variants created", "Platform compliance requirements met"],
    ["document"], ["finn", "echo"], ["ad-creative"], ["advertising", "copy", "digital-ads", "creative"],
    "Creates compelling advertising copy for digital platforms. Covers platform-native formats, A/B variants, and compliance requirements."
)

skills["agenda-setting"] = make_skill(
    "agenda-setting", "Agenda Setting", "operations", "beginner", "high",
    "Use when preparing meeting agendas, workshop outlines, or collaborative session plans for client or internal meetings.",
    "You are a meeting strategist and facilitator who creates structured, outcome-focused agendas.",
    "## Agenda Setting Workflow\n\nBuild an effective meeting agenda:\n\n- [ ] 1. Clarify purpose: Define the meeting objective ({{meeting_objective}})\n- [ ] 2. Identify outcomes: What decisions or outputs are needed\n- [ ] 3. Structure flow: Sequence topics from information sharing to decision-making\n- [ ] 4. Time allocation: Assign realistic time blocks to each agenda item\n- [ ] 5. Assign owners: Designate facilitators for each topic ({{facilitators}})\n- [ ] 6. Pre-work: Identify what attendees need to prepare\n\n## Inputs\n- Meeting type: {{meeting_type}}\n- Attendees: {{attendees}}\n- Duration: {{duration}}\n- Objective: {{meeting_objective}}",
    "## Meeting Agenda: {{meeting_name}}\n\n### Meeting Details\n| Element | Details |\n|---------|---------|\n| Date & Time | {{date_time}} |\n| Duration | {{duration}} |\n| Location/Link | {{location}} |\n| Attendees | {{attendees}} |\n| Objective | {{meeting_objective}} |\n\n### Desired Outcomes\n1. [What must be decided/achieved]\n2. [What outputs are needed]\n\n### Pre-Work Required\n| Person | Preparation |\n|--------|-------------|\n| | |\n\n### Agenda\n| # | Topic | Presenter | Time | Desired Outcome |\n|---|-------|-----------|------|------------------|\n| 1 | | | {{time_1}} | |\n| 2 | | | {{time_2}} | |\n| 3 | | | {{time_3}} | |\n| 4 | | | {{time_4}} | |\n| 5 | | | {{time_5}} | |\n\n### Logistics\n- Materials needed:\n- Room setup:",
    [
        {"name": "meeting_name", "type": "string", "required": True, "description": "Meeting or workshop title"},
        {"name": "meeting_type", "type": "string", "required": True, "description": "Type (brainstorm, review, decision, status update)"},
        {"name": "duration", "type": "string", "required": True, "description": "Meeting duration"},
        {"name": "attendees", "type": "string", "required": True, "description": "List of attendees with roles"},
        {"name": "meeting_objective", "type": "string", "required": True, "description": "Primary meeting goal"},
        {"name": "facilitators", "type": "string", "required": False, "description": "Topic facilitators"}
    ],
    [
        {"step": 1, "name": "Purpose Clarification", "action": "Define the core objective and success criteria", "verify": "Objective is specific and achievable"},
        {"step": 2, "name": "Outcome Definition", "action": "Identify what must be decided or produced", "verify": "Outcomes are measurable"},
        {"step": 3, "name": "Flow Design", "action": "Sequence topics for optimal discussion", "verify": "Flow builds toward decisions"},
        {"step": 4, "name": "Time Allocation", "action": "Assign time blocks to each item", "verify": "Time allocations are realistic"},
        {"step": 5, "name": "Pre-work Identification", "action": "List required preparations for attendees", "verify": "Pre-work is clear and assigned"}
    ],
    ["Meeting objective is specific and measurable", "Time allocations are realistic", "Agenda flows from information to decision", "All topics have designated owners", "Pre-work is distributed before the meeting", "Agenda shared at least 24 hours in advance"],
    ["document", "presentation"], ["piper", "sage"], [], ["meetings", "facilitation", "planning"],
    "Builds structured, outcome-focused meeting agendas and workshop outlines. Covers flow design, time allocation, and pre-work preparation."
)

skills["agile-scrum"] = make_skill(
    "agile-scrum", "Agile / Scrum Framework", "operations", "intermediate", "medium",
    "Use when setting up agile workflows, running sprints, facilitating ceremonies, or implementing Scrum for agency or project management.",
    "You are an agile coach and Scrum master with deep expertise in iterative delivery, sprint planning, and team dynamics.",
    "## Agile/Scrum Implementation Workflow\n\nSet up or run an agile process:\n\n- [ ] 1. Team setup: Define team structure, roles ({{team_roles}}), and capacity\n- [ ] 2. Backlog creation: Build initial backlog from {{project_requirements}}\n- [ ] 3. Sprint planning: Plan sprint goals and commitments ({{sprint_length}})\n- [ ] 4. Daily operations: Run standups and manage blockers\n- [ ] 5. Review and retrospective: Demonstrate outputs and improve processes\n- [ ] 6. Velocity tracking: Measure and forecast using velocity data\n\n## Inputs\n- Team size: {{team_size}}\n- Sprint length: {{sprint_length}}\n- Working days: {{working_days}}",
    "## Agile/Scrum Framework: {{team_name}}\n\n### Team Structure\n| Role | Person | Responsibilities |\n|------|--------|------------------|\n| Scrum Master | | | \n| Product Owner | | |\n| Developers | | |\n\n### Sprint Cadence\n| Ceremony | Frequency | Duration | Participants |\n|----------|-----------|---------|---------------|\n| Sprint Planning | | | |\n| Daily Standup | | | |\n| Sprint Review | | | |\n| Retrospective | | | |\n\n### Backlog Structure\n| Priority | Item | Size (SP) | Status |\n|----------|------|-----------|--------|\n| P0 | | | |\n| P1 | | | |\n| P2 | | | |\n\n### Velocity and Forecasting\n| Sprint | Committed | Completed | Velocity |\n|--------|-----------|-----------|----------|\n| n-2 | | | |\n| n-1 | | | |\n| n (current) | | | |\n\n**Forecast:** Based on velocity of {{velocity}}, {{sprint_goal}} is achievable.\n\n### Definition of Done\n- [ ] Code reviewed\n- [ ] Tests written and passing\n- [ ] Documentation updated\n- [ ] Product Owner acceptance",
    [
        {"name": "team_name", "type": "string", "required": True, "description": "Name of the team or project"},
        {"name": "team_size", "type": "string", "required": True, "description": "Number of team members"},
        {"name": "team_roles", "type": "string", "required": True, "description": "Team roles and assignments"},
        {"name": "sprint_length", "type": "string", "required": True, "description": "Sprint duration in weeks"},
        {"name": "velocity", "type": "string", "required": False, "description": "Historical velocity in story points"},
        {"name": "working_days", "type": "string", "required": False, "description": "Working days per week"}
    ],
    [
        {"step": 1, "name": "Team Setup", "action": "Define roles, responsibilities, and team agreements", "verify": "Each member understands their role"},
        {"step": 2, "name": "Backlog Creation", "action": "Build and prioritize initial backlog", "verify": "Items are estimated and ordered"},
        {"step": 3, "name": "Sprint Planning", "action": "Plan sprint goal and commit to items", "verify": "Commitment matches team capacity"},
        {"step": 4, "name": "Daily Operations", "action": "Run standups and unblock team", "verify": "Blockers resolved within 24h"},
        {"step": 5, "name": "Review and Retro", "action": "Demo work and identify improvements", "verify": "Action items from retro are tracked"}
    ],
    ["Team roles and responsibilities are clear", "Backlog items are estimated and prioritized", "Sprint goals are specific and achievable", "Daily standups are time-boxed (15 min)", "Velocity is tracked over 3+ sprints", "Retrospective action items are followed up"],
    ["spreadsheet", "document"], ["piper"], [], ["agile", "scrum", "project-management", "delivery"],
    "Implements agile/Scrum workflows including sprint planning, ceremonies, velocity tracking, and continuous improvement."
)

skills["art-direction"] = make_skill(
    "art-direction", "Art Direction", "creative", "advanced", "medium",
    "Use when providing creative direction for campaigns, establishing visual direction, or guiding the aesthetic and style of creative output.",
    "You are an art director with expertise in visual storytelling, brand aesthetics, and creative campaign direction across multiple media.",
    "## Art Direction Workflow\n\nEstablish and communicate visual direction:\n\n- [ ] 1. Brand review: Analyze existing brand guidelines for {{brand_name}}\n- [ ] 2. Campaign brief alignment: Match direction to {{campaign_objectives}}\n- [ ] 3. Mood board development: Curate visual references for {{creative_vibe}}\n- [ ] 4. Style framework: Define color, typography, and imagery guidelines\n- [ ] 5. Asset specifications: Set technical requirements for {{deliverables}}\n- [ ] 6. Feedback loops: Create revision and approval process\n\n## Inputs\n- Brand: {{brand_name}}\n- Campaign: {{campaign_name}}\n- Audience: {{target_audience}}",
    "## Art Direction: {{campaign_name}}\n\n### Creative Direction Overview\n| Element | Direction |\n|---------|-----------|\n| Brand | {{brand_name}} |\n| Campaign | {{campaign_name}} |\n| Target audience | {{target_audience}} |\n| Creative vibe | {{creative_vibe}} |\n\n### Mood and Inspiration\n[Description of the mood, references, and visual language]\n\n### Color Palette\n| Color | Hex | Usage |\n|-------|-----|-------|\n| Primary | | |\n| Secondary | | |\n| Accent | | |\n| Background | | |\n| Text | | |\n\n### Typography\n| Element | Font | Weight | Size |\n|---------|------|--------|------|\n| Headlines | | | |\n| Body | | | |\n| CTA | | | |\n\n### Imagery and Style\n- **Photography style:**\n- **Illustration approach:**\n- **Iconography:**\n- **Composition principles:**\n\n### Technical Specifications\n| Asset | Format | Dimensions | Specs |\n|-------|--------|-----------|-------|\n| | | | |\n\n### Do's and Don'ts\n**Do:**\n- [ ] \n\n**Don't:**\n- [ ]",
    [
        {"name": "brand_name", "type": "string", "required": True, "description": "Brand being directed"},
        {"name": "campaign_name", "type": "string", "required": True, "description": "Campaign or project name"},
        {"name": "campaign_objectives", "type": "string", "required": True, "description": "Campaign goals and KPIs"},
        {"name": "target_audience", "type": "string", "required": True, "description": "Primary and secondary audiences"},
        {"name": "creative_vibe", "type": "string", "required": True, "description": "Desired mood and aesthetic"},
        {"name": "deliverables", "type": "string", "required": False, "description": "List of required assets"}
    ],
    [
        {"step": 1, "name": "Brand Analysis", "action": "Review existing brand guidelines and assets", "verify": "Brand DNA is understood and respected"},
        {"step": 2, "name": "Brief Alignment", "action": "Align direction with campaign objectives", "verify": "Direction serves business goals"},
        {"step": 3, "name": "Mood Board", "action": "Develop visual references and mood language", "verify": "Mood board is cohesive and directional"},
        {"step": 4, "name": "Style Framework", "action": "Define color, type, and imagery rules", "verify": "Framework is actionable for designers"},
        {"step": 5, "name": "Spec Documentation", "action": "Document technical requirements", "verify": "Specs are clear to all producers"}
    ],
    ["Direction aligns with brand guidelines", "Mood board is cohesive and inspirational", "Color palette is distinctive and functional", "Typography choices are appropriate for audience", "Technical specs are actionable", "Direction serves campaign objectives"],
    ["presentation", "document"], ["finn", "nova-studio"], [], ["art-direction", "creative", "visual", "branding"],
    "Establishes visual direction for campaigns including mood boards, color palettes, typography, and technical specifications."
)

skills["attribution-modeling"] = make_skill(
    "attribution-modeling", "Attribution Modeling", "media", "advanced", "low",
    "Use when analyzing marketing attribution, choosing attribution models, or reporting on channel effectiveness across the customer journey.",
    "You are a marketing analytics specialist with expertise in attribution modeling, multi-touch journey analysis, and channel ROI measurement.",
    "## Attribution Modeling Workflow\n\nAnalyze marketing attribution:\n\n- [ ] 1. Journey mapping: Map the typical customer journey for {{customer_type}}\n- [ ] 2. Data collection: Gather touchpoint data across {{channels}}\n- [ ] 3. Model selection: Choose attribution approach ({{attribution_model}})\n- [ ] 4. Channel analysis: Evaluate each channel's contribution\n- [ ] 5. Budget implications: Model budget shifts based on findings\n- [ ] 6. Reporting: Present findings with actionable recommendations\n\n## Inputs\n- Customer type: {{customer_type}}\n- Channels: {{channels}}\n- Time period: {{time_period}}\n- Model: {{attribution_model}}",
    "## Attribution Analysis: {{client_name}}\n\n### Analysis Overview\n| Parameter | Value |\n|-----------|-------|\n| Customer type | {{customer_type}} |\n| Time period | {{time_period}} |\n| Attribution model | {{attribution_model}} |\n| Channels analyzed | {{channels}} |\n\n### Channel Attribution Scores\n| Channel | Last-click | First-click | Linear | Data-driven |\n|---------|------------|-------------|--------|--------------|\n| Paid Search | | | | |\n| Paid Social | | | | |\n| Organic | | | | |\n| Email | | | | |\n| Display | | | | |\n| Direct | | | | |\n\n### Key Findings\n1. [Most influential awareness channel]\n2. [Key conversion driver]\n3. [Underweighted channel opportunity]\n4. [Overweighted channel inefficiency]\n\n### Budget Reallocation Recommendations\n| Channel | Current % | Recommended % | Change | Expected Impact |\n|---------|-----------|---------------|--------|------------------|\n| | | | | |\n\n### Model Methodology Notes\n[Explain attribution assumptions and limitations]",
    [
        {"name": "client_name", "type": "string", "required": True, "description": "Client or brand name"},
        {"name": "customer_type", "type": "string", "required": True, "description": "Type of customer or transaction"},
        {"name": "channels", "type": "string", "required": True, "description": "Marketing channels to analyze"},
        {"name": "time_period", "type": "string", "required": True, "description": "Analysis time period"},
        {"name": "attribution_model", "type": "string", "required": True, "description": "Primary attribution model"},
        {"name": "total_budget", "type": "string", "required": False, "description": "Total marketing budget"}
    ],
    [
        {"step": 1, "name": "Journey Mapping", "action": "Document typical customer touchpoint journey", "verify": "Journey reflects actual customer behavior"},
        {"step": 2, "name": "Data Collection", "action": "Gather touchpoint data from all channels", "verify": "Data is complete and accurate"},
        {"step": 3, "name": "Model Selection", "action": "Choose attribution approach based on business model", "verify": "Model choice is justified"},
        {"step": 4, "name": "Channel Analysis", "action": "Calculate attribution scores per channel", "verify": "Scores are calculated consistently"},
        {"step": 5, "name": "Budget Modeling", "action": "Model impact of reallocation scenarios", "verify": "Recommendations are data-supported"}
    ],
    ["Customer journey map reflects actual behavior", "Attribution model choice is justified", "Channel scores are calculated consistently", "Data gaps are acknowledged", "Recommendations consider business constraints", "Report is understandable by stakeholders"],
    ["spreadsheet", "analytics"], ["dex", "nova"], [], ["attribution", "analytics", "media", "roi"],
    "Analyzes marketing attribution across channels using multiple models. Generates channel scores and budget reallocation recommendations."
)

skills["audience-persona-creation"] = make_skill(
    "audience-persona-creation", "Audience Persona Creation", "research", "intermediate", "medium",
    "Use when creating marketing personas, target audience profiles, or buyer personas for campaign planning and content strategy.",
    "You are a consumer research specialist with expertise in audience segmentation, persona development, and consumer psychology.",
    "## Persona Creation Workflow\n\nBuild detailed audience personas:\n\n- [ ] 1. Research synthesis: Draw from {{research_sources}} to understand audience\n- [ ] 2. Demographic definition: Define demographics for {{persona_name}}\n- [ ] 3. Psychographic mapping: Identify values, attitudes, and lifestyle\n- [ ] 4. Behavioral analysis: Map media consumption, purchasing patterns\n- [ ] 5. Pain point identification: Define key challenges and motivations\n- [ ] 6. Journey mapping: Document awareness-to-loyalty journey\n\n## Inputs\n- Persona name: {{persona_name}}\n- Industry: {{industry}}\n- Research sources: {{research_sources}}",
    "## Audience Persona: {{persona_name}}\n\n### Persona Overview\n| Attribute | Details |\n|-----------|---------|\n| Name | {{persona_name}} |\n| Age range | |\n| Location | |\n| Income | |\n| Industry | {{industry}} |\n| Role | |\n\n### Demographics\n- **Education:**\n- **Family status:**\n- **Location type:**\n\n### Psychographics\n- **Values:**\n- **Attitudes:**\n- **Interests:**\n- **Lifestyle:**\n\n### Professional Context\n- **Job title:**\n- **Company size:**\n- **Key responsibilities:**\n- **Pain points:**\n\n### Media Consumption\n| Channel | Platform | Frequency |\n|---------|----------|-----------|\n| Social | | |\n| News | | |\n| Industry | | |\n\n### Purchasing Behavior\n- **Budget authority:**\n- **Purchase triggers:**\n- **Decision timeline:**\n\n### Content Preferences\n- **Format:**\n- **Tone:**\n- **Key messages:**",
    [
        {"name": "persona_name", "type": "string", "required": True, "description": "Persona name or archetype"},
        {"name": "industry", "type": "string", "required": True, "description": "Industry or market context"},
        {"name": "research_sources", "type": "string", "required": True, "description": "Data sources for persona development"},
        {"name": "age_range", "type": "string", "required": False, "description": "Target age range"},
        {"name": "primary_channel", "type": "string", "required": False, "description": "Primary discovery channel"}
    ],
    [
        {"step": 1, "name": "Research Synthesis", "action": "Gather and analyze existing audience data", "verify": "Research is current and relevant"},
        {"step": 2, "name": "Demographic Definition", "action": "Define core demographic characteristics", "verify": "Demographics are specific and actionable"},
        {"step": 3, "name": "Psychographic Mapping", "action": "Identify values, attitudes, and lifestyle", "verify": "Psychographics feel human and real"},
        {"step": 4, "name": "Behavioral Analysis", "action": "Map media and purchasing behaviors", "verify": "Behaviors are observable and measurable"},
        {"step": 5, "name": "Pain Point Identification", "action": "Define key challenges and motivations", "verify": "Pain points are specific to role/context"}
    ],
    ["Persona is based on research, not assumptions", "Demographics are specific and verifiable", "Psychographics feel like a real person", "Behaviors are observable actions", "Pain points are tied to business context", "Persona is useful for content and campaign planning"],
    ["spreadsheet", "presentation"], ["atlas", "echo"], ["content-calendar"], ["personas", "audience", "targeting", "research"],
    "Creates detailed marketing personas including demographics, psychographics, behaviors, pain points, and content preferences."
)

skills["audience-research"] = make_skill(
    "audience-research", "Audience Research", "research", "intermediate", "medium",
    "Use when conducting audience research, gathering consumer insights, or validating assumptions about target audiences.",
    "You are a market research specialist with expertise in qualitative and quantitative research methodologies, survey design, and consumer insight generation.",
    "## Audience Research Workflow\n\nConduct comprehensive audience research:\n\n- [ ] 1. Research design: Define methodology ({{methodology}}) and sample ({{sample_size}})\n- [ ] 2. Data collection: Gather primary and secondary data from {{sources}}\n- [ ] 3. Segmentation: Identify distinct audience segments\n- [ ] 4. Insight synthesis: Extract key themes and patterns\n- [ ] 5. Validation: Cross-check findings against {{existing_data}}\n- [ ] 6. Report: Present findings with actionable recommendations\n\n## Inputs\n- Research objective: {{research_objective}}\n- Methodology: {{methodology}}\n- Sample: {{sample_size}}",
    "## Audience Research Report: {{client_name}}\n\n### Research Overview\n| Element | Details |\n|---------|---------|\n| Client | {{client_name}} |\n| Objective | {{research_objective}} |\n| Methodology | {{methodology}} |\n| Sample size | {{sample_size}} |\n\n### Key Findings\n\n#### Finding 1: [Title]\n**Insight:** [2-3 sentences]\n**Implication:** [What this means for marketing]\n\n#### Finding 2: [Title]\n**Insight:** [2-3 sentences]\n**Implication:** [What this means for marketing]\n\n### Audience Segments\n| Segment | Size (%) | Key Characteristics | Marketing Approach |\n|---------|----------|---------------------|--------------------|\n| | | | |\n\n### Behavioral Patterns\n| Behavior | % Reporting | Segment |\n|----------|-------------|---------|\n| | | |\n\n### Media Consumption\n| Channel | Primary | Secondary | Rare |\n|---------|---------|-----------|------|\n| | | | |\n\n### Recommendations\n1. [Priority recommendation with rationale]\n2. [Secondary recommendation]\n3. [Tactical next steps]\n\n### Methodology Notes\n[Research limitations and confidence levels]",
    [
        {"name": "client_name", "type": "string", "required": True, "description": "Client or brand name"},
        {"name": "research_objective", "type": "string", "required": True, "description": "Primary research question"},
        {"name": "methodology", "type": "string", "required": True, "description": "Research methodology (survey, focus groups, etc.)"},
        {"name": "sample_size", "type": "string", "required": True, "description": "Sample size and demographics"},
        {"name": "sources", "type": "string", "required": True, "description": "Primary and secondary data sources"},
        {"name": "existing_data", "type": "string", "required": False, "description": "Existing data to validate against"}
    ],
    [
        {"step": 1, "name": "Research Design", "action": "Define methodology and sampling approach", "verify": "Design will yield actionable insights"},
        {"step": 2, "name": "Data Collection", "action": "Gather primary and secondary data", "verify": "Data is representative and current"},
        {"step": 3, "name": "Segmentation", "action": "Identify distinct audience segments", "verify": "Segments are meaningful and differentiable"},
        {"step": 4, "name": "Insight Synthesis", "action": "Extract themes and patterns from data", "verify": "Insights are surprising and actionable"},
        {"step": 5, "name": "Validation", "action": "Cross-check against existing knowledge", "verify": "Findings are credible"}
    ],
    ["Research methodology is appropriate for objectives", "Sample is representative of target population", "Findings are based on data, not assumptions", "Insights are actionable for marketing", "Segments are meaningfully different", "Limitations are acknowledged"],
    ["spreadsheet", "analytics", "web-search"], ["atlas"], [], ["research", "audience", "insights", "market-research"],
    "Conducts comprehensive audience research with key findings, segment profiles, behavioral patterns, and actionable recommendations."
)

skills["audience-targeting"] = make_skill(
    "audience-targeting", "Audience Targeting", "media", "intermediate", "medium",
    "Use when defining audience targeting strategies for paid media campaigns, selecting audience segments, or optimizing targeting parameters.",
    "You are a media planning specialist with expertise in audience targeting, segmentation strategies, and paid media optimization.",
    "## Audience Targeting Workflow\n\nDefine effective targeting strategy:\n\n- [ ] 1. Objective alignment: Match targeting to campaign goals ({{campaign_objective}})\n- [ ] 2. Audience definition: Define primary and secondary targets\n- [ ] 3. Platform selection: Choose platforms that reach {{target_audience}}\n- [ ] 4. Targeting parameters: Set demographics, interests, and behaviors\n- [ ] 5. Lookalike modeling: Identify seed audiences for expansion\n- [ ] 6. Exclusions: Define who NOT to target ({{exclusion_criteria}})\n\n## Inputs\n- Campaign objective: {{campaign_objective}}\n- Target audience: {{target_audience}}\n- Budget: {{budget}}",
    "## Audience Targeting Strategy: {{client_name}}\n\n### Campaign Overview\n| Parameter | Value |\n|-----------|-------|\n| Client | {{client_name}} |\n| Campaign | {{campaign_name}} |\n| Objective | {{campaign_objective}} |\n| Budget | {{budget}} |\n\n### Primary Audience\n| Attribute | Targeting Parameter |\n|-----------|---------------------|\n| Age | |\n| Gender | |\n| Location | |\n| Language | |\n| Interests | |\n| Behaviors | |\n\n### Secondary Audience\n| Attribute | Targeting Parameter |\n|-----------|---------------------|\n| | |\n\n### Platform Targeting Matrix\n| Platform | Audience Size | Estimated CPM | Fit Score |\n|----------|---------------|--------------|----------|\n| Meta | | | |\n| Google | | | |\n| LinkedIn | | | |\n| TikTok | | | |\n\n### Lookalike and Expansion\n| Source Audience | Platform | Lookalike % | Expected reach |\n|----------------|----------|-------------|----------------|\n| | | | |\n\n### Exclusions\n| Category | Criteria | Rationale |\n|----------|----------|------------|\n| Past purchasers | {{exclude_past}} | |\n| Competitor users | {{exclude_competitors}} | |\n\n### Optimization Plan\n| Phase | Targeting Adjustment | Trigger |\n|-------|----------------------|---------|\n| Week 1-2 | | |\n| Week 3-4 | | |",
    [
        {"name": "client_name", "type": "string", "required": True, "description": "Client brand name"},
        {"name": "campaign_name", "type": "string", "required": True, "description": "Campaign name"},
        {"name": "campaign_objective", "type": "string", "required": True, "description": "Campaign objective (awareness, consideration, conversion)"},
        {"name": "target_audience", "type": "string", "required": True, "description": "Primary target audience"},
        {"name": "budget", "type": "string", "required": True, "description": "Campaign budget"},
        {"name": "exclusion_criteria", "type": "string", "required": False, "description": "Exclusion parameters"}
    ],
    [
        {"step": 1, "name": "Objective Alignment", "action": "Match targeting to campaign goals", "verify": "Targeting serves the stated objective"},
        {"step": 2, "name": "Audience Definition", "action": "Define primary and secondary targets", "verify": "Audiences are specific and reachable"},
        {"step": 3, "name": "Platform Selection", "action": "Choose platforms that match audience", "verify": "Platform selection is data-informed"},
        {"step": 4, "name": "Parameter Setup", "action": "Configure targeting parameters", "verify": "Parameters are specific but not restrictive"},
        {"step": 5, "name": "Exclusion Strategy", "action": "Define exclusions to improve efficiency", "verify": "Exclusions do not harm reach"}
    ],
    ["Targeting serves campaign objective", "Audience is specific but large enough", "Platform selection matches audience behavior", "Exclusions are justified and documented", "Lookalike audiences are based on quality seed data", "Optimization plan has clear triggers"],
    ["analytics", "spreadsheet"], ["nova", "atlas"], ["media-plan"], ["targeting", "media", "audience", "paid-ads"],
    "Defines audience targeting strategies for paid media including demographics, lookalike modeling, exclusions, and optimization plans."
)

for skill_id, skill_data in skills.items():
    filepath = os.path.join(skills_dir, f"{skill_id}.json")
    with open(filepath, 'w') as f:
        json.dump(skill_data, f, indent=2)
    print(f"Written: {filepath}")

print(f"\nBatch 1 done: {len(skills)} skills")
