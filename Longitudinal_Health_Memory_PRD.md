# Longitudinal Health Memory - Product Requirements Document (PRD)

## Project Overview

**Project Name:** Longitudinal Health Memory powered by Cognee

**Objective**

Transform fragmented medical records into a lifelong, evolving health
memory using Cognee's graph-based memory model. The product is **not**
an AI doctor or document storage platform. Its primary purpose is to
continuously build, enrich, and retrieve structured medical memory.

The existing MVP is already functional. This document describes the
features to add.

------------------------------------------------------------------------

# Existing Stack

Frontend - Next.js - TypeScript - Tailwind CSS

Backend - FastAPI

Memory Layer - Cognee

Database - PostgreSQL

Storage - Existing object storage

OCR - Existing OCR pipeline

LLM - Gemini/OpenAI (existing)

------------------------------------------------------------------------

# High-Level Architecture

Upload → OCR → Medical Entity Extraction → Cognee remember() →
PostgreSQL metadata → Timeline Update → Graph Update

Doctor Query → Cognee recall() → Graph Traversal → Structured Context →
LLM Summary

New Report → Entity Extraction → remember() → improve() → Timeline
Update → Memory Evolution

------------------------------------------------------------------------

# Design Principles

-   Memory is the product.
-   Never expose raw PDFs first.
-   Everything begins with the patient's memory.
-   Every upload enriches existing knowledge.
-   Graph relationships are first-class citizens.
-   UI should feel modern, minimal and clinical.

------------------------------------------------------------------------

# Feature 1 --- Patient Profile

## Goal

Create the root entity for the patient's lifelong medical memory.

## UI

Create `/patient/profile`

Display:

-   Avatar
-   Name
-   Age
-   Blood Group
-   Height
-   Weight
-   Gender
-   Emergency Contact

Buttons

-   Edit Profile
-   Upload Report

## Backend

Create patient if not existing.

After creation:

remember(patient)

Patient becomes root graph node.

Acceptance Criteria

-   One patient = one root memory.
-   Every upload references this node.

------------------------------------------------------------------------

# Feature 2 --- Health Memory Timeline

## Goal

Homepage becomes a chronological medical history.

Route

`/patient/timeline`

Each card

-   Date
-   Event
-   Icon
-   Related Report
-   Disease
-   Medication

Clicking expands:

-   Original report
-   Extracted entities
-   Graph links

Timeline auto-refreshes after uploads.

Acceptance

Uploading a report instantly creates timeline events.

------------------------------------------------------------------------

# Feature 3 --- Report Upload + OCR

Route

`/patient/upload`

Supported

-   PDF
-   PNG
-   JPG

Pipeline

Upload

↓

OCR

↓

LLM Medical Extraction

↓

remember()

↓

Timeline

↓

Graph

Extract

-   Diseases
-   Medicines
-   Allergies
-   Doctors
-   Hospitals
-   Dates
-   Lab values
-   Symptoms
-   Surgeries

Store both

-   Original document
-   Structured JSON

Acceptance

Every upload creates graph nodes.

------------------------------------------------------------------------

# Feature 4 --- Cognee Memory Builder

Every upload executes

remember()

Pseudo workflow

1.  Parse entities.
2.  Check duplicates.
3.  Merge nodes.
4.  Create relationships.
5.  Save memory.

Relationships

Patient

→ Disease

→ Medication

→ Report

→ Doctor

→ Hospital

→ Timeline Event

Acceptance

Duplicate diseases never create duplicate nodes.

------------------------------------------------------------------------

# Feature 5 --- Natural Language Queries

Route

`/doctor/query`

Input

Natural language question.

Examples

-   When was diabetes diagnosed?
-   Compare HbA1c history.
-   Why was Aspirin stopped?
-   Show recurring symptoms.

Pipeline

Question

↓

recall()

↓

Graph Context

↓

LLM

↓

Answer + evidence

Display

Answer

Supporting timeline

Related reports

Graph links

Acceptance

Answers reference graph context rather than keyword search.

------------------------------------------------------------------------

# Feature 6 --- Relationship Explorer

Route

`/doctor/graph`

Use

React Flow or Cytoscape.js.

Display interactive graph.

Nodes

-   Patient
-   Disease
-   Medication
-   Doctor
-   Report
-   Hospital
-   Allergy

Edges

Meaningful relationships.

Click node

Highlight neighbors.

Side panel shows metadata.

Acceptance

Graph updates immediately after uploads.

------------------------------------------------------------------------

# Feature 7 --- Doctor Dashboard

Route

`/doctor/dashboard`

Cards

Patient Snapshot

Current Conditions

Current Medication

Allergies

Recent Reports

Timeline

Quick Actions

Ask AI

Open Graph

View Timeline

Acceptance

Doctor understands patient within 30 seconds.

------------------------------------------------------------------------

# Feature 8 --- AI Clinical Summary

Generate from graph context.

Prompt should include

Timeline

Diseases

Medication history

Surgeries

Family history

Latest reports

Output

Narrative summary.

No hallucinations.

Always cite supporting graph nodes.

Acceptance

Summary changes after every upload.

------------------------------------------------------------------------

# Feature 9 --- Memory Evolution

Purpose

Demonstrate improve().

Page

`/patient/evolution`

Split view

Before upload

After upload

Highlight

New nodes

Merged nodes

New relationships

Timeline additions

Animations encouraged.

Acceptance

User visually understands memory growth.

------------------------------------------------------------------------

# Suggested Folder Structure

    app/
        patient/
            profile/
            upload/
            timeline/
            evolution/

        doctor/
            dashboard/
            query/
            graph/

    components/
        Timeline/
        Graph/
        Upload/
        Summary/
        Dashboard/
        Patient/

    backend/
        services/
            memory.py
            ocr.py
            graph.py
            summary.py
            timeline.py

------------------------------------------------------------------------

# API Endpoints

POST /patients

GET /patients/{id}

POST /reports/upload

GET /timeline/{patient_id}

GET /graph/{patient_id}

POST /query

GET /summary/{patient_id}

GET /evolution/{patient_id}

------------------------------------------------------------------------

# UI Requirements

Use shadcn/ui.

Cards.

Rounded corners.

Soft shadows.

Timeline animations.

Responsive.

Dark mode support.

------------------------------------------------------------------------

# Definition of Done

A judge should be able to:

1.  Create patient.
2.  Upload reports.
3.  Watch timeline populate.
4.  Watch graph grow.
5.  Ask natural language questions.
6.  Receive graph-grounded answers.
7.  Open doctor dashboard.
8.  Generate AI summary.
9.  Compare memory before and after new uploads.

The demo should clearly communicate that Cognee is acting as a lifelong
memory engine rather than a document retrieval system.
